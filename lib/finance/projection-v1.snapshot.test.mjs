/* Golden-fixture tests for the v1 bucket engine.

   projection.test.mjs pins v0, which is frozen. Nothing pinned v1, so a change
   to runProjectionV1 could move every number in the app without a single test
   turning red. These snapshots close that hole: after this file lands, "no
   projection number moved" is

       git diff --exit-code lib/finance/fixtures/

   rather than an assertion. If a change here is deliberate, regenerate with:
   UPDATE_SNAPSHOTS=1 npm test    and review the diff line by line.

   v1-goals-heavy carries a crypto exitTax override on purpose. drawFromBuckets
   is NOT additive when per-bucket exit-tax rates differ within a tier — one
   draw of X raises a different amount than two draws summing to X — so anyone
   who later computes per-goal funding by splitting the engine's goal draw will
   break this snapshot rather than silently change everyone's numbers. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { runProjectionV1 } from "./projection.mjs";
import { CURRENT_YEAR } from "./format.mjs";

const FIXTURES = ["v1-default", "v1-goals-heavy"];

const load = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));

const snapUrl = (name) => new URL(`./fixtures/${name}.snapshot.json`, import.meta.url);

/* The `year` field is derived from today's date, so it would invalidate every
   snapshot on 1 January. It is asserted separately against its own rule. */
const stripYear = (out) => ({
  ...out,
  data: out.data.map(({ year, ...rest }) => rest),
});

function checkSnapshot(name, out) {
  const url = snapUrl(name);
  const stripped = stripYear(out);
  if (process.env.UPDATE_SNAPSHOTS) {
    mkdirSync(new URL("./fixtures/", import.meta.url), { recursive: true });
    writeFileSync(url, JSON.stringify(stripped, null, 2) + "\n");
    return;
  }
  assert.ok(existsSync(url), `snapshot for "${name}" missing; run UPDATE_SNAPSHOTS=1 npm test`);
  assert.deepEqual(stripped, JSON.parse(readFileSync(url)));
}

for (const name of FIXTURES) {
  test(`${name}: v1 projection output is stable`, () => {
    checkSnapshot(name, runProjectionV1(load(name)));
  });

  test(`${name}: one row per year, inclusive of both endpoints`, () => {
    const plan = load(name);
    const { data } = runProjectionV1(plan);
    assert.equal(data.length, plan.lifeExpectancy - plan.currentAge + 1);
    assert.equal(data[0].age, plan.currentAge);
    assert.equal(data.at(-1).age, plan.lifeExpectancy);
  });

  test(`${name}: calendar year advances one per row`, () => {
    const { data } = runProjectionV1(load(name));
    data.forEach((row, i) => assert.equal(row.year, CURRENT_YEAR + i));
  });

  test(`${name}: no row contains a non-finite number`, () => {
    const { data } = runProjectionV1(load(name));
    for (const row of data) {
      for (const [k, v] of Object.entries(row)) {
        assert.ok(typeof v !== "number" || Number.isFinite(v), `${k} is ${v} at age ${row.age}`);
      }
      for (const [b, v] of Object.entries(row.buckets)) {
        assert.ok(Number.isFinite(v), `bucket ${b} is ${v} at age ${row.age}`);
        assert.ok(v >= 0, `bucket ${b} went negative (${v}) at age ${row.age}`);
      }
    }
  });

  test(`${name}: the engine does not mutate the plan it is given`, () => {
    const plan = load(name);
    const before = structuredClone(plan);
    runProjectionV1(plan);
    assert.deepEqual(plan, before);
  });
}

/* The fixture is built with a goal at 92 against a lifeExpectancy of 80. The
   year loop ends first, so that goal is never charged — no row carries its
   cost. The goal-gap surface has to report this as "after your planned
   horizon" rather than quietly dropping it, so pin the engine behaviour it is
   reporting on. */
test("v1-goals-heavy: a goal past lifeExpectancy is never charged", () => {
  const plan = load("v1-goals-heavy");
  const beyond = plan.goals.filter((g) => g.age > plan.lifeExpectancy);
  assert.ok(beyond.length > 0, "fixture should carry a goal past the horizon");

  const { data } = runProjectionV1(plan);
  const totalGoalCost = data.reduce((s, r) => s + r.goalCost, 0);
  const charged = plan.goals
    .filter((g) => g.age <= plan.lifeExpectancy && g.age >= plan.currentAge)
    .reduce((s, g) => s + (g.hasLoan ? g.amount * (g.downPaymentPct / 100) : g.amount), 0);

  assert.equal(Math.round(totalGoalCost), Math.round(charged));
});

/* Two goals land on age 34. The engine sums them into one draw and discards
   goal identity, which is exactly why per-goal funding has to be derived from
   the row rather than from a second set of draws. */
test("v1-goals-heavy: same-age goals are charged as one summed cost", () => {
  const plan = load("v1-goals-heavy");
  const sameAge = plan.goals.filter((g) => g.age === 34);
  assert.equal(sameAge.length, 2);

  const { data } = runProjectionV1(plan);
  const row = data.find((r) => r.age === 34);
  const expected = sameAge.reduce(
    (s, g) => s + (g.hasLoan ? g.amount * (g.downPaymentPct / 100) : g.amount), 0);

  assert.equal(row.goalCost, Math.round(expected));
});

/* v0 returned no rows when lifeExpectancy equalled currentAge; v1 guards on
   `years < 0` instead, so the same input gives exactly one row — today. That
   difference is deliberate and is pinned here so nobody "fixes" v1 to match
   the older, frozen engine. */
test("a same-age horizon returns exactly one row", () => {
  const plan = { ...load("v1-default"), lifeExpectancy: 28 };
  const { data } = runProjectionV1(plan);
  assert.equal(data.length, 1);
  assert.equal(data[0].age, 28);
});

test("an inverted horizon returns no rows rather than throwing", () => {
  const plan = { ...load("v1-default"), lifeExpectancy: 20 };
  assert.deepEqual(runProjectionV1(plan).data, []);
});
