import { test } from "node:test";
import assert from "node:assert/strict";
import { drawFromBuckets } from "./drawdown.mjs";

/* Exit tax inherits the user's single slider for liquid buckets; locked ones sit
   at 0. Unlock ages: PPF is tenure-based, EPF 58, NPS 60. */
const ctx = {
  exitTax: { mf: 12.5, stocks: 12.5, crypto: 12.5, fdrd: 12.5, lic: 12.5,
             unallocated: 12.5, ppf: 0, epf: 0, nps: 0 },
  unlockAge: { ppf: 43, epf: 58, nps: 60 },
};

const sum = (b) => Object.values(b).reduce((s, v) => s + v, 0);

test("liquid is drained before any locked bucket is touched", () => {
  const b = { mf: 100000, ppf: 500000 };
  const r = drawFromBuckets(b, 50000, 65, ctx);
  assert.equal(r.unfunded, 0);
  assert.equal(b.ppf, 500000, "a locked bucket was raided while liquid remained");
  assert.ok(b.mf < 100000);
});

test("the net amount needed is grossed up per bucket, not globally", () => {
  const b = { mf: 1000000 };
  const r = drawFromBuckets(b, 87500, 40, ctx);
  // 87,500 net at 12.5% tax requires selling 100,000 gross.
  assert.equal(Math.round(b.mf), 900000);
  assert.equal(Math.round(r.grossSold), 100000);
  assert.equal(Math.round(r.taxPaid), 12500);
  assert.equal(Math.round(r.netRaised), 87500);
});

test("buckets with different tax rates are each grossed up at their own rate", () => {
  // ppf is tax-free and unlocked at 65; mf is taxed. Drawing from both must not
  // apply one blended rate to the pair.
  const b = { mf: 500000, ppf: 500000 };
  const r = drawFromBuckets(b, 100000, 65, ctx);
  assert.equal(r.unfunded, 0);
  // All of it comes from liquid first, so tax is the mf rate on the whole draw.
  assert.equal(Math.round(r.taxPaid), Math.round(100000 / 0.875 * 0.125));
});

test("a small bucket contributes its pro-rata share, it is not drained first", () => {
  const b = { mf: 10000, unallocated: 1000000 };
  const r = drawFromBuckets(b, 500000, 40, ctx);
  assert.equal(r.unfunded, 0);
  // mf holds ~1% of the portfolio, so it supplies ~1% of the draw and survives.
  assert.ok(b.mf > 0, "the small bucket was drained ahead of its share");
  assert.ok(r.perBucket.mf / r.grossSold < 0.02);
});

test("a bucket whose gross-up exceeds its balance rolls the residual onward", () => {
  // mf is taxed punitively, so raising its pro-rata share of NET cash would
  // require selling more gross than it holds. The shortfall must be picked up
  // by the other bucket rather than silently under-delivering.
  const skewed = { exitTax: { mf: 90, unallocated: 0 }, unlockAge: {} };
  const b = { mf: 100000, unallocated: 100000 };
  // Tier net capacity is 10,000 (mf) + 100,000 (unallocated) = 110,000, which
  // covers the 100,000 needed, so this takes the pro-rata path rather than the
  // drain path. mf's half-share of 50,000 net would need 500,000 gross, far
  // more than it holds, so it caps out and the rest must roll to unallocated.
  const r = drawFromBuckets(b, 100000, 40, skewed);
  assert.equal(r.unfunded, 0, "residual was dropped instead of rolling on");
  assert.equal(b.mf, 0, "the capped bucket should be exhausted");
  assert.ok(Math.abs(r.netRaised - 100000) < 1);
  // mf yields only 10,000 net; unallocated supplies the other 90,000 tax-free.
  assert.equal(Math.round(b.unallocated), 10000);
});

test("locked buckets are unavailable before their unlock age", () => {
  const b = { ppf: 5000000 };
  const r = drawFromBuckets(b, 100000, 35, ctx);
  assert.equal(r.unfunded, 100000, "a locked holding was treated as spendable");
  assert.equal(b.ppf, 5000000);
});

test("locked buckets become available at their unlock age", () => {
  const b = { ppf: 5000000 };
  const r = drawFromBuckets(b, 100000, 43, ctx);
  assert.equal(r.unfunded, 0);
  assert.equal(b.ppf, 4900000);
});

test("each locked bucket unlocks on its own schedule", () => {
  const b = { ppf: 100000, epf: 100000, nps: 100000 };
  // At 58: ppf (43) and epf (58) are open, nps (60) is not.
  const r = drawFromBuckets(b, 250000, 58, ctx);
  assert.equal(b.nps, 100000, "NPS was drawn before age 60");
  assert.equal(r.unfunded, 50000);
});

test("no bucket ever goes negative; the gap is reported as unfunded", () => {
  const b = { mf: 1000 };
  const r = drawFromBuckets(b, 500000, 40, ctx);
  assert.equal(b.mf, 0);
  assert.ok(r.unfunded > 0);
  assert.ok(Object.values(b).every((v) => v >= 0));
  // 1000 gross at 12.5% yields 875 net, so 499,125 is unfunded.
  assert.equal(Math.round(r.unfunded), Math.round(500000 - 1000 * 0.875));
});

test("an empty portfolio does not divide by zero", () => {
  const b = { mf: 0, unallocated: 0 };
  const r = drawFromBuckets(b, 100000, 40, ctx);
  assert.equal(r.unfunded, 100000);
  assert.ok(Number.isFinite(r.netRaised));
});

test("drawing nothing is a no-op", () => {
  const b = { mf: 100000 };
  for (const need of [0, -5, NaN, undefined]) {
    const r = drawFromBuckets(b, need, 40, ctx);
    assert.equal(r.unfunded, 0);
    assert.equal(b.mf, 100000);
  }
});

test("a draw that exactly exhausts a bucket lands on zero, not on float dust", () => {
  const b = { mf: 100000 };
  const r = drawFromBuckets(b, 100000 * 0.875, 40, ctx);
  assert.equal(b.mf, 0);
  assert.ok(r.unfunded < 1);
});

test("a zero exit tax means gross equals net", () => {
  const zero = { exitTax: { mf: 0 }, unlockAge: {} };
  const b = { mf: 100000 };
  const r = drawFromBuckets(b, 40000, 40, zero);
  assert.equal(b.mf, 60000);
  assert.equal(r.taxPaid, 0);
});

test("an out-of-range exit tax is clamped rather than dividing by zero", () => {
  const bad = { exitTax: { mf: 100 }, unlockAge: {} };
  const b = { mf: 100000 };
  const r = drawFromBuckets(b, 50000, 40, bad);
  assert.ok(Number.isFinite(b.mf) && b.mf >= 0);
  assert.ok(Number.isFinite(r.unfunded));
});

test("pro-rata keeps the allocation mix roughly stable", () => {
  const b = { mf: 800000, unallocated: 200000 };
  const before = b.mf / sum(b);
  drawFromBuckets(b, 100000, 40, ctx);
  const after = b.mf / sum(b);
  assert.ok(Math.abs(before - after) < 0.01, "one bucket was drained ahead of the other");
});

test("perBucket records where the money actually came from", () => {
  const b = { mf: 500000, unallocated: 500000 };
  const r = drawFromBuckets(b, 100000, 40, ctx);
  const recorded = Object.values(r.perBucket).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(recorded - r.grossSold) < 1);
  assert.deepEqual(Object.keys(r.perBucket).sort(), ["mf", "unallocated"]);
});

test("liquid then unlocked-locked is the order, with the residual rolling across", () => {
  const b = { mf: 10000, ppf: 1000000 };
  const r = drawFromBuckets(b, 500000, 65, ctx);
  assert.equal(r.unfunded, 0);
  assert.equal(b.mf, 0, "liquid should be exhausted first");
  // 10,000 gross from mf yields 8,750 net; the remaining 491,250 comes from
  // tax-free ppf one-for-one.
  assert.equal(Math.round(b.ppf), Math.round(1000000 - (500000 - 8750)));
});
