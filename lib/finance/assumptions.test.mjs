/* Guards on the instrument table itself.

   These are cheap and catch the two ways BUCKET_DEFS silently breaks things
   downstream: a bucket added without a volatility (which the Success Score
   would read as zero, quietly treating a real asset as risk-free), and a
   bucket that belongs to neither tier (which drawFromBuckets would never
   draw from). */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BUCKET_DEFS, LIQUID_BUCKETS, LOCKED_BUCKETS, ILLIQUID_BUCKETS,
  LIQUID, LOCKED, ILLIQUID,
  ASSUMPTION_SOURCES,
} from "./assumptions.mjs";

test("every bucket declares a finite, non-negative volatility", () => {
  for (const [b, def] of Object.entries(BUCKET_DEFS)) {
    assert.ok(Number.isFinite(def.volatility), `${b} has no volatility`);
    assert.ok(def.volatility >= 0, `${b} has negative volatility`);
  }
});

test("the tier split covers every bucket exactly once", () => {
  const all = Object.keys(BUCKET_DEFS).sort();
  const split = [...LIQUID_BUCKETS, ...LOCKED_BUCKETS, ...ILLIQUID_BUCKETS].sort();
  assert.deepEqual(split, all);
  assert.equal(new Set(split).size, split.length, "a bucket appears in both tiers");

  for (const [b, def] of Object.entries(BUCKET_DEFS)) {
    assert.ok(def.tier === LIQUID || def.tier === LOCKED || def.tier === ILLIQUID,
      `${b} has tier ${def.tier}`);
  }
});

test("principal-protected instruments are not modelled as volatile as equity", () => {
  /* A sanity ordering, not a precise claim: if someone ever swaps these
     numbers around, the Success Score silently starts telling people their FDs
     are riskier than their stocks. */
  assert.ok(BUCKET_DEFS.fdrd.volatility < BUCKET_DEFS.mf.volatility);
  assert.ok(BUCKET_DEFS.ppf.volatility < BUCKET_DEFS.mf.volatility);
  assert.ok(BUCKET_DEFS.epf.volatility < BUCKET_DEFS.mf.volatility);
  assert.ok(BUCKET_DEFS.mf.volatility < BUCKET_DEFS.stocks.volatility);
  assert.ok(BUCKET_DEFS.stocks.volatility < BUCKET_DEFS.crypto.volatility);
  /* Property is not a safe asset, but it is not equity either. */
  assert.ok(BUCKET_DEFS.ppf.volatility < BUCKET_DEFS.property.volatility);
  assert.ok(BUCKET_DEFS.property.volatility < BUCKET_DEFS.mf.volatility);
});

test("the volatility assumptions are documented", () => {
  assert.ok(typeof ASSUMPTION_SOURCES.volatility === "string");
  for (const b of Object.keys(BUCKET_DEFS)) {
    assert.ok(ASSUMPTION_SOURCES.volatility.includes(b), `${b} is undocumented`);
  }
});
