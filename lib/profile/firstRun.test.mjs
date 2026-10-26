import { test } from "node:test";
import assert from "node:assert/strict";
import { firstRunPlan, sameData, hasEnteredData } from "./firstRun.mjs";
import { migrate } from "./migrate.mjs";
import { serialize } from "./schema.mjs";

test("a fresh first-run plan has nothing entered", () => {
  assert.equal(hasEnteredData(firstRunPlan()), false);
});

test("the first-run plan is the same every time it is built", () => {
  assert.ok(sameData(firstRunPlan(), firstRunPlan()));
});

test("an untouched plan reloaded from the local draft still reads as untouched", () => {
  /* The draft is JSON, read back through migrate(): same contents, possibly
     rebuilt in a different key order. */
  const reloaded = migrate(JSON.parse(JSON.stringify(serialize(firstRunPlan()))));
  assert.equal(hasEnteredData(reloaded), false);
});

test("any edit counts as entered data", () => {
  const named = firstRunPlan();
  named.personal.fullName = "Asha";
  assert.equal(hasEnteredData(named), true);

  const moved = firstRunPlan();
  moved.expenses.household += 5000;
  assert.equal(hasEnteredData(moved), true);

  const noGoals = firstRunPlan();
  noGoals.goals = [];
  assert.equal(hasEnteredData(noGoals), true);
});

test("changing a value and changing it back leaves nothing entered", () => {
  const p = firstRunPlan();
  const was = p.retirementAge;
  p.retirementAge = was + 5;
  p.retirementAge = was;
  assert.equal(hasEnteredData(p), false);
});

test("sameData ignores key order but not values or shape", () => {
  assert.ok(sameData({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 }));
  assert.ok(!sameData({ a: 1 }, { a: 1, b: undefined }));
  assert.ok(!sameData({ a: [1, 2] }, { a: [2, 1] }));
  assert.ok(!sameData({ a: null }, { a: 0 }));
  assert.ok(!sameData([], {}));
});
