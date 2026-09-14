/* Proof that runProjectionV1's `opts` parameter is a no-op when unused.

   The Success Score needs a fresh return draw per year, which means reaching
   into the growth step. That is the one place this work touches the engine
   every existing number comes from, so "it changes nothing unless you ask it
   to" has to be asserted rather than assumed — including the stronger claim
   that the hook is a faithful substitution for the code it replaced, not
   merely absent by default. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runProjectionV1, bucketReturn } from "./projection.mjs";

const load = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));

const FIXTURES = ["v1-default", "v1-goals-heavy"];

for (const name of FIXTURES) {
  test(`${name}: omitting opts is identical to not having the parameter`, () => {
    const plan = load(name);
    const base = runProjectionV1(plan);

    assert.deepEqual(runProjectionV1(plan, undefined), base);
    assert.deepEqual(runProjectionV1(plan, {}), base);
    assert.deepEqual(runProjectionV1(plan, { returnFor: undefined }), base);
  });

  test(`${name}: the hook faithfully replaces what it substitutes`, () => {
    /* Absence proves the default branch works. This proves the hook branch
       computes the same thing — so a bug in the wiring cannot hide behind
       "well, nobody passes opts in production".

       The caller has to apply the post-retirement cap itself, which is the
       whole reason `working` is handed to it: the engine must not layer a
       one-sided cap on top of a random draw. Reproducing the engine's own rule
       here must therefore reproduce the engine's own numbers exactly. */
    const plan = load(name);
    const base = runProjectionV1(plan);
    const hooked = runProjectionV1(plan, {
      returnFor: (b, y, ctx) => {
        const r = bucketReturn(plan, b);
        return ctx.working ? r : Math.min(r, plan.postRetireReturn);
      },
    });

    assert.deepEqual(hooked, base);
  });

  test(`${name}: the post-retirement cap is NOT applied on top of returnFor`, () => {
    /* The bug this pins: capping a drawn return is one-sided, so a good year
       gets clipped to the conservative assumption while a bad year falls
       through untouched. Every simulated retirement then bleeds out and a plan
       the projection says ends with crores scores near zero. */
    const plan = load(name);
    const high = 40;
    const out = runProjectionV1(plan, { returnFor: () => high });

    /* If the cap still applied, post-retirement growth would run at
       postRetireReturn instead of 40%. Compare against an explicit run at the
       capped rate: they must differ. */
    const capped = runProjectionV1(plan, {
      returnFor: (b, y, ctx) => (ctx.working ? high : Math.min(high, plan.postRetireReturn)),
    });

    const retiredRow = out.data.find((r) => r.isRetired);
    if (retiredRow) {
      const other = capped.data.find((r) => r.age === retiredRow.age);
      assert.notDeepEqual(retiredRow.buckets, other.buckets,
        "returnFor's value must be used as-is after retirement");
    }
  });

  test(`${name}: returnFor is equivalent to setting every bucket override`, () => {
    const plan = load(name);

    const viaHook = runProjectionV1(plan, { returnFor: () => 0 });

    const overridden = structuredClone(plan);
    overridden.bucketOverrides = {};
    for (const b of Object.keys(runProjectionV1(plan).data[0].buckets)) {
      overridden.bucketOverrides[b] = { ...(plan.bucketOverrides?.[b] ?? {}), annualReturn: 0 };
    }
    const viaOverrides = runProjectionV1(overridden);

    /* blendedReturn and returnRate report the PLANNING assumption and are
       deliberately not routed through the hook, so they legitimately differ.
       Everything the success criterion reads must match. */
    assert.equal(viaHook.data.length, viaOverrides.data.length);
    viaHook.data.forEach((row, i) => {
      const other = viaOverrides.data[i];
      assert.equal(row.netWorth, other.netWorth, `netWorth at age ${row.age}`);
      assert.equal(row.cumUnfunded, other.cumUnfunded, `cumUnfunded at age ${row.age}`);
      assert.deepEqual(row.buckets, other.buckets, `buckets at age ${row.age}`);
    });
    assert.equal(viaHook.depletionAge, viaOverrides.depletionAge);
  });

  test(`${name}: returnFor receives the year index, not just the bucket`, () => {
    const plan = load(name);
    const seen = [];
    runProjectionV1(plan, {
      returnFor: (b, y) => { seen.push(y); return bucketReturn(plan, b); },
    });

    /* Growth is skipped at y=0 by design, so the first year seen is 1 and the
       last is the horizon length. A per-year draw depends on this. */
    assert.ok(seen.length > 0);
    assert.equal(Math.min(...seen), 1);
    assert.equal(Math.max(...seen), plan.lifeExpectancy - plan.currentAge);
  });
}

test("a per-year return source actually varies the outcome", () => {
  /* Guards against the hook being wired somewhere that never runs.

     Compared mid-horizon and on the peak, not on the final row: netWorth is
     clamped at zero, and both of these plans deplete before lifeExpectancy, so
     the last row reads 0 either way and would hide a completely dead hook. */
  const plan = load("v1-default");
  const flat = runProjectionV1(plan, { returnFor: () => 8 });
  const alternating = runProjectionV1(plan, { returnFor: (b, y) => (y % 2 ? 4 : 12) });

  const at = (out, age) => out.data.find((r) => r.age === age).netWorth;
  assert.notEqual(at(flat, 50), at(alternating, 50));
  assert.notEqual(flat.peakNW, alternating.peakNW);
});
