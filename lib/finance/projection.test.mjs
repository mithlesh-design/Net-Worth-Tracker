/* Golden-fixture tests for the v0 projection engine.

   These pin the CURRENT behaviour so that later work on the v1 bucket engine can
   be shown to change only what it intends to change. If a change here is
   deliberate, regenerate with:  UPDATE_SNAPSHOTS=1 npm test
   and review the resulting diff line by line. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { runProjection } from "./projection.mjs";
import { CURRENT_YEAR } from "./format.mjs";

const load = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));

const snapUrl = (name) => new URL(`./fixtures/${name}.snapshot.json`, import.meta.url);

/* The `year` field is derived from today's date, so it would invalidate every
   snapshot on 1 January. It is asserted separately against its own rule instead. */
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

for (const name of ["v0-default", "v0-capped-sip"]) {
  test(`${name}: projection output is stable`, () => {
    checkSnapshot(name, runProjection(load(name)));
  });

  test(`${name}: one row per year, inclusive of both endpoints`, () => {
    const input = load(name);
    const { data } = runProjection(input);
    assert.equal(data.length, input.lifeExpectancy - input.currentAge + 1);
    assert.equal(data[0].age, input.currentAge);
    assert.equal(data.at(-1).age, input.lifeExpectancy);
  });

  test(`${name}: calendar year advances one per row`, () => {
    const { data } = runProjection(load(name));
    data.forEach((row, i) => assert.equal(row.year, CURRENT_YEAR + i));
  });

  test(`${name}: no row contains NaN`, () => {
    const { data } = runProjection(load(name));
    for (const row of data) {
      for (const [k, v] of Object.entries(row)) {
        assert.ok(typeof v !== "number" || Number.isFinite(v), `${k} is ${v} at age ${row.age}`);
      }
    }
  });
}

test("a zero-length horizon returns no rows", () => {
  const input = { ...load("v0-default"), lifeExpectancy: 28 };
  assert.deepEqual(runProjection(input), { data: [], fiAge: null, peakNW: 0 });
});

test("an inverted horizon returns no rows rather than throwing", () => {
  const input = { ...load("v0-default"), lifeExpectancy: 20 };
  assert.deepEqual(runProjection(input), { data: [], fiAge: null, peakNW: 0 });
});
