import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContributionPlan, streamValueAtRetirement } from "./contributions.mjs";
import { runProjectionV1, bucketReturn } from "./projection.mjs";
import { freshDefaults } from "../profile/schema.mjs";

/* One stream on its own: income far above it, nothing else spent or saved, so
   the engine funds it in full and its bucket holds only this stream plus the
   holding it feeds. */
function oneStream(key, cfg, holdings = {}) {
  const p = freshDefaults();
  p.currentAge = 28;
  p.retirementAge = 58;
  p.lifeExpectancy = 85;
  p.incomes = [{ id: 1, name: "Salary", role: "salary", amount: 1e8, frequency: "monthly", growthRate: 0 }];
  p.expenses = { household: 0, rent: 0 };
  p.goals = [];
  p.investSurplus = false;
  for (const k of Object.keys(p.holdings)) p.holdings[k] = 0;
  Object.assign(p.holdings, holdings);
  for (const c of Object.values(p.contributions)) if (c && !Array.isArray(c)) c.amount = 0;
  p.contributions[key] = { ...p.contributions[key], ...cfg };
  return p;
}

const estimate = (p, key, bucket, opening = 0) => streamValueAtRetirement(
  buildContributionPlan(p).items.find((i) => i.key === key),
  { annualReturn: bucketReturn(p, bucket), retiredReturn: p.postRetireReturn,
    years: p.retirementAge - p.currentAge, opening });

const engineAt = (p, bucket) =>
  runProjectionV1(p).data.find((r) => r.age === p.retirementAge).buckets[bucket];

/* The reported case: 1.5 L a month, 10% step-up, 12%, 15 L already invested,
   28 to 58. The card said 133.74 Cr; it paid a 31st instalment at 58 and grew
   the year the engine calls retired at 12% instead of the 7% cap. */
test("a SIP's value at retirement matches what the projection holds", () => {
  const p = oneStream("mfSip", { amount: 150000, frequency: "monthly", stepUp: 10 }, { mf: 1500000 });
  const est = estimate(p, "mfSip", "mf", 1500000);
  assert.ok(Math.abs(est - engineAt(p, "mf")) <= 1, `${est} vs ${engineAt(p, "mf")}`);
  assert.ok(est < 133e7, "no instalment in the retirement year");
});

test("nothing is contributed in the retirement year itself", () => {
  const item = { annualBase: 100, stepUp: 0, annualCap: Infinity };
  assert.equal(streamValueAtRetirement(item, { annualReturn: 0, years: 3 }), 300);
  assert.equal(streamValueAtRetirement(item, { annualReturn: 0, years: 0 }), 0);
});

/* Without the cap a 10% step-up takes a 12,500/month PPF past the 1.5 L
   statutory ceiling in year one, and the card credited every rupee of it. */
test("a PPF estimate respects the annual ceiling, as the projection does", () => {
  const p = oneStream("ppf", { amount: 12500, frequency: "monthly", stepUp: 10 });
  const est = estimate(p, "ppf", "ppf");
  assert.ok(Math.abs(est - engineAt(p, "ppf")) <= 1, `${est} vs ${engineAt(p, "ppf")}`);
});
