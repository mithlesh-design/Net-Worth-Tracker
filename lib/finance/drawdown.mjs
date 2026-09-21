/* ═══════════════════════════════════════════════════════════════════════════
   DRAWDOWN

   Raises a NET amount of cash by selling from the instrument buckets, in tier
   order: everything liquid first, then only those locked buckets whose unlock
   age has been reached.

   Three properties this must hold, each of which the old engine broke:

   1. No bucket ever goes negative. The v0 engine ran `nw = nw * (1 + r) - spend`
      on an already-negative balance, compounding a shortfall at the investment
      return rate until the plan showed minus crores behind a chart clamped to
      zero. Here the gap is reported as `unfunded` instead, so a funding
      shortfall is stated rather than silently absorbed.

   2. The gross-up is per bucket. Raising N net from a bucket taxed at t means
      selling N / (1 - t). Applying one blended rate across buckets invents tax
      on tax-exempt holdings, and applying none overstates what a sale yields.

   3. A bucket running dry rolls its residual on. `min(need / (1 - t), balance)`
      alone silently under-delivers when the balance is short, so the shortfall
      has to be re-spread over the buckets that remain. Hence the multi-pass
      loop with re-normalisation.
   ═══════════════════════════════════════════════════════════════════════════ */

import { BUCKET_DEFS, LIQUID, LOCKED } from "./assumptions.mjs";

/* One rupee. Every comparison uses it so float dust cannot leave a bucket
   holding 1e-9 or report an unfunded gap of 4e-10. */
const EPS = 1;

/* Bounds the re-normalisation. Each pass either empties at least one bucket or
   satisfies the need, so this is far more headroom than the bucket count needs. */
const MAX_PASSES = 12;

/* Tax must stay strictly below 100% or 1 / (1 - t) diverges. A stored profile
   can be hand-edited to anything, so clamp rather than trust. */
const taxFraction = (rate) => Math.min(Math.max(Number(rate) || 0, 0), 95) / 100;

export function drawFromBuckets(buckets, netNeeded, age, ctx) {
  const result = { netRaised: 0, grossSold: 0, taxPaid: 0, perBucket: {}, unfunded: 0 };
  let remaining = Number(netNeeded);
  if (!Number.isFinite(remaining) || remaining <= EPS) return result;

  const taxOf = (b) => taxFraction(ctx.exitTax?.[b]);
  const names = Object.keys(buckets);
  /* Household ledgers key buckets per person ("7:mf"), so the caller may say
     which tier a key is in. The default reads a plain bucket name. */
  const tierOf = ctx.tierOf ?? ((b) => BUCKET_DEFS[b]?.tier);

  const tiers = [
    names.filter((b) => tierOf(b) === LIQUID),
    names.filter((b) => tierOf(b) === LOCKED && age >= (ctx.unlockAge?.[b] ?? Infinity)),
  ];

  const take = (b, gross) => {
    const net = gross * (1 - taxOf(b));
    buckets[b] -= gross;
    if (buckets[b] < EPS) buckets[b] = 0;
    result.grossSold += gross;
    result.taxPaid += gross - net;
    result.perBucket[b] = (result.perBucket[b] || 0) + gross;
    remaining -= net;
    return net;
  };

  for (const tier of tiers) {
    for (let pass = 0; pass < MAX_PASSES && remaining > EPS; pass++) {
      const eligible = tier.filter((b) => buckets[b] > EPS);
      if (!eligible.length) break;

      const totalBalance = eligible.reduce((s, b) => s + buckets[b], 0);
      /* The most net cash this tier could yield if fully liquidated. */
      const netCapacity = eligible.reduce((s, b) => s + buckets[b] * (1 - taxOf(b)), 0);

      if (netCapacity <= remaining + EPS) {
        /* The tier cannot cover the need. Drain it and carry the rest onward. */
        for (const b of eligible) take(b, buckets[b]);
        break;
      }

      /* The tier can cover it. Ask each bucket for its share by balance, so the
         allocation mix stays roughly stable rather than draining the
         lowest-taxed holding first. Anything a bucket cannot supply is picked
         up on the next pass.

         The shares are computed from the remainder as it stood at the START of
         this pass. Reading the live `remaining` inside the loop would shrink
         each successive bucket's share as earlier ones paid out, quietly
         skewing the draw toward whichever bucket happened to be first. */
      const needAtPassStart = remaining;
      let progressed = false;
      for (const b of eligible) {
        if (remaining <= EPS) break;
        const askNet = needAtPassStart * (buckets[b] / totalBalance);
        const grossWanted = askNet / (1 - taxOf(b));
        const grossTake = Math.min(grossWanted, buckets[b]);
        if (grossTake <= EPS) continue;
        take(b, grossTake);
        progressed = true;
      }
      /* Cannot happen given the guards above, but a silent infinite loop here
         would be far worse than an early exit. */
      if (!progressed) break;
    }
  }

  /* Anything under a rupee is float residue from the per-bucket gross-ups, not
     a funding shortfall. Reporting it would put a spurious "unfunded" warning
     in front of the user on a plan that balances exactly. */
  result.unfunded = remaining > EPS ? remaining : 0;
  result.netRaised = netNeeded - result.unfunded;
  return result;
}
