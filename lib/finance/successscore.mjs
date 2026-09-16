/* ═══════════════════════════════════════════════════════════════════════════
   SUCCESS SCORE

   "You have an 80-85% chance of funding your goals."

   The projection is deterministic: one set of returns, one answer. That answer
   is useful for showing mechanism but it cannot say how much of the outcome
   rests on markets behaving. This module runs the same engine many times with
   returns drawn around the user's own assumptions and reports how often the
   plan survives.

   Everything here is an ESTIMATE built on estimated volatilities
   (ASSUMPTION_SOURCES.volatility) and must be labelled as one wherever it
   reaches the screen. The number is a planning aid, not a forecast.
   ═══════════════════════════════════════════════════════════════════════════ */

import { runProjectionV1, bucketReturn } from "./projection.mjs";
import { BUCKET_DEFS } from "./assumptions.mjs";

export const SUCCESS_SCORE_VERSION = 1;
export const DEFAULT_RUNS = 200;

/* A CONSTANT seed, never derived from the plan.

   A plan-derived seed would reshuffle every market path on every keystroke, so
   nudging a slider by 1% would move the score by several points in an arbitrary
   direction. Users read that as the app being broken. Fixing the paths means a
   change in the score is caused by the change to the plan and nothing else. */
export const SUCCESS_SEED = 0x5EED5C0;

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* mulberry32 — 32 bits of state, no dependency, period 2^32. Ample for a few
   hundred paths over a ~60-year horizon. Re-seeded on every call, so the module
   holds no state and two calls on the same plan return the same score. */
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Box-Muller, keeping both roots so no draw is wasted. */
function gaussianSource(rand) {
  let spare = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0;
    while (u === 0) u = rand();
    const v = rand();
    const m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  };
}

/* Mirrors bucketReturn: a user override wins, else the instrument default. */
export function bucketVolatility(plan, b) {
  const o = plan?.bucketOverrides?.[b]?.volatility;
  if (o !== undefined && o !== null) return Math.max(0, num(o));
  return Math.max(0, num(BUCKET_DEFS[b]?.volatility));
}

/* Log-normal, not normal.

   With crypto at sigma 70 a plain normal draw puts the return below -100% at
   z < -1.43 — roughly 8% of crypto-years would drive a bucket negative, which
   drawFromBuckets is not built to survive and which is not a thing that can
   happen to an unlevered holding. The log-normal form makes a growth factor of
   zero or less structurally impossible.

   The -s²/2 drift term makes E[1+r] equal the deterministic assumption, so the
   simulation is not quietly pessimistic relative to the projection it sits
   next to. Guarded by a test — do not "simplify" this back to a plain normal. */
function lognormalReturn(mu, sd, z) {
  if (!(sd > 0)) return mu;
  const s = Math.log(1 + sd / 100);
  const m = Math.log(1 + Math.max(-99, mu) / 100) - (s * s) / 2;
  return (Math.exp(m + s * z) - 1) * 100;
}

const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

const EMPTY = {
  score: 0, band: { lo: 0, hi: 0 }, runs: 0, seed: SUCCESS_SEED, stdError: 0,
  corpus: { p10: 0, p50: 0, p90: 0 }, deterministic: 0,
  failures: { count: 0, firstFailureAge: { p10: null, p50: null, p90: null }, reasons: [] },
  enoughInput: false,
};

export function computeSuccessScore(plan, opts = {}) {
  const deterministicRun = runProjectionV1(plan);
  const rows = deterministicRun.data;
  if (!rows.length) return { ...EMPTY };

  /* Nothing to simulate: no opening portfolio, no contributions, no income.
     The engine would dutifully return 0% and the UI would tell someone who has
     entered nothing yet that they are certain to fail. */
  const hasIncome = rows.some((r) => r.income > 0);
  const hasContribution = rows.some((r) => r.plannedContribution > 0 || r.payrollContribution > 0);
  if (deterministicRun.openingPortfolio <= 0 && !hasIncome && !hasContribution) {
    return { ...EMPTY, deterministic: rows.at(-1)?.netWorthRaw ?? 0 };
  }

  /* Even, because antithetic variates come in pairs. */
  const requested = Math.max(2, Math.floor(num(opts.runs, DEFAULT_RUNS)));
  const runs = requested % 2 === 0 ? requested : requested + 1;
  const seed = num(opts.seed, SUCCESS_SEED);

  const buckets = Object.keys(rows[0].buckets);
  const years = rows.length;
  const mu = {}, sd = {};
  for (const b of buckets) {
    mu[b] = bucketReturn(plan, b);
    sd[b] = bucketVolatility(plan, b);
  }

  const postRetire = num(plan.postRetireReturn);

  const rand = mulberry32(seed);
  const gauss = gaussianSource(rand);

  let successes = 0;
  const terminal = [];
  const failureAges = [];
  let goalFailures = 0, expenseFailures = 0;

  let shocks = null;
  for (let run = 0; run < runs; run++) {
    /* One shock per YEAR, shared across every bucket, scaled by each bucket's
       own sigma.

       Nine independent shocks would let the buckets diversify each other down
       to near-zero portfolio volatility, which is not how Indian equity, NPS
       and crypto behave in a drawdown — they fall together. Perfect
       correlation overstates the link in the other direction and so widens the
       distribution, which is the conservative error for a number people act
       on. It is stated in the UI rather than left implicit.

       Antithetic variates: odd runs reuse the previous run's shocks negated.
       Free variance reduction, and fully deterministic. */
    if (run % 2 === 0) {
      shocks = new Array(years);
      for (let y = 0; y < years; y++) shocks[y] = gauss();
    } else {
      shocks = shocks.map((z) => -z);
    }
    const z = shocks;

    const out = runProjectionV1(plan, {
      /* The retirement adjustment is applied to the MEAN, before the draw —
         never to the drawn value afterwards. Capping a sample is one-sided:
         good years would be clipped to the conservative assumption while bad
         years fell through, draining every simulated retirement regardless of
         the plan.

         Volatility is scaled with the mean when the cap bites, because the
         thing postRetireReturn describes is a shift into safer assets, and a
         safer portfolio is less volatile as well as lower-returning. Holding
         sigma at its equity level while forcing the mean down to 7% would
         model a portfolio nobody holds. */
      returnFor: (b, y, ctx) => {
        let m = mu[b], v = sd[b];
        if (!ctx.working && m > postRetire) {
          const shrink = m > 0 ? Math.max(0, Math.min(1, postRetire / m)) : 1;
          m = postRetire;
          v = v * shrink;
        }
        return lognormalReturn(m, v, z[y] ?? 0);
      },
    });

    /* depletionAge === null already means "funded every goal and never ran
       out": it is set the first year cumUnfunded exceeds a rupee, and
       cumUnfunded accumulates both the cash shortfall and the goal shortfall.
       A run that leaves any goal unfunded has a non-null depletionAge by
       definition. */
    if (out.depletionAge === null) {
      successes++;
    } else {
      failureAges.push(out.depletionAge);
      /* Same min(unfundedThisYear, goalCost) identity the goal-gap surface
         uses — see goalgap.mjs. */
      const goalDriven = out.data.some(
        (r) => r.goalCost > 0 && Math.min(r.unfundedThisYear, r.goalCost) > 1);
      if (goalDriven) goalFailures++; else expenseFailures++;
    }

    terminal.push(out.data.at(-1)?.netWorthRaw ?? 0);
  }

  const score = Math.round((successes / runs) * 1000) / 10;
  const p = successes / runs;
  const stdError = Math.sqrt((p * (1 - p)) / runs) * 100;

  /* Five points wide because that is about one binomial standard error at 200
     runs (at p = 0.8, SE = 2.83 points). The band IS the honest precision —
     never render a bare integer from this. */
  const lo = Math.min(95, Math.max(0, Math.floor(score / 5) * 5));

  terminal.sort((a, b) => a - b);
  failureAges.sort((a, b) => a - b);

  const reasons = [];
  if (goalFailures > 0) reasons.push({ kind: "goal", count: goalFailures });
  if (expenseFailures > 0) reasons.push({ kind: "expenses", count: expenseFailures });
  reasons.sort((a, b) => b.count - a.count);

  return {
    score,
    band: { lo, hi: Math.min(100, lo + 5) },
    runs,
    seed,
    stdError,
    corpus: {
      p10: percentile(terminal, 0.10),
      p50: percentile(terminal, 0.50),
      p90: percentile(terminal, 0.90),
    },
    /* Kept so the UI can show it beside p50. The median of a log-normal sits
       below its mean, so the simulated middle will look "wrong" next to the
       straight-line projection unless both are on screen and labelled. */
    deterministic: rows.at(-1)?.netWorthRaw ?? 0,
    failures: {
      count: runs - successes,
      firstFailureAge: {
        p10: failureAges.length ? percentile(failureAges, 0.10) : null,
        p50: failureAges.length ? percentile(failureAges, 0.50) : null,
        p90: failureAges.length ? percentile(failureAges, 0.90) : null,
      },
      reasons,
    },
    enoughInput: true,
  };
}
