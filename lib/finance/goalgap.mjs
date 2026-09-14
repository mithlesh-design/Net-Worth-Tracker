/* ═══════════════════════════════════════════════════════════════════════════
   GOAL GAP — a READ-ONLY pass over an already-computed projection.

   This module never calls runProjectionV1, never mutates `plan` or
   `simulation`, and contributes nothing back to either. It cannot move a
   projection number, by construction.

   It answers a question the engine deliberately does not. The engine prices a
   goal in TODAY's rupees and charges exactly that at the target age: a ₹30 L
   education at 45 is charged as ₹30 L and reported fully funded, when the same
   education costs ₹80.78 L in the rupees of 2043. This module states both
   figures and keeps the difference in its own field, `inflationGap`, so the UI
   can separate two very different sentences:

     engineGap    — "you are under-saving"
     inflationGap — "your plan is priced in today's money"

   When plan.inflateGoals is on, the engine charges the inflated cost too and
   inflationGap collapses to zero; the two surfaces then agree by construction.
   See goalCostAt() in projection.mjs, which both sides share.
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  goalsDueAt, goalRequiredToday, goalInflationRate, goalCostAt,
} from "./projection.mjs";

export const GOAL_GAP_VERSION = 1;

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const EMPTY = {
  goals: [],
  series: [],
  totals: {
    requiredToday: 0, requiredInflated: 0, funded: 0,
    engineGap: 0, inflationGap: 0, gap: 0, fundedPct: 1,
  },
  inflationRate: 0,
  discountRate: 0,
  worstGapAge: null,
  crossoverAge: null,
  allFunded: true,
  coversRealCost: true,
  hasGoals: false,
};

/* Pass the SAME clamped plan that produced `simulation` — clampPlan(plan) —
   or the goal list and the rows can disagree about ages and amounts.

   opts:
     inflationRate  default plan.inflationRate. Never + lifestyleCreep: creep
                    inflates a discretionary standard of living, not the price
                    of a degree.
     useAppreciationForAssets  default true. A goal carrying appreciationRate
                    is priced up at that rate instead. Not double-counting: the
                    engine applies appreciationRate to the asset only AFTER
                    purchase (loanYear), never to the purchase price.
     discountRate   default the portfolio's opening blended return. Used to
                    bring a future cost back to an earlier age. */
export function computeGoalGap(plan, simulation, opts = {}) {
  const rows = simulation?.data;
  if (!plan || !Array.isArray(rows) || rows.length === 0) return { ...EMPTY };

  const inflationRate = num(opts.inflationRate ?? plan.inflationRate);
  const useAppreciation = opts.useAppreciationForAssets !== false;
  const discountRate = num(
    opts.discountRate ?? rows[0]?.blendedReturn ?? plan.expectedXIRR, 0);

  const age0 = rows[0].age;
  const lastAge = rows.at(-1).age;
  const rowByAge = new Map(rows.map((r) => [r.age, r]));

  /* ── 1. Price every goal ───────────────────────────────────────────────── */
  const goals = (plan.goals ?? []).map((g) => {
    const age = num(g.age);
    const yearsAway = age - age0;

    /* `requiredToday` is what the ENGINE charges — goalRequiredToday over
       goalCostAt, the same pair goalsDueAt uses, so the two can never disagree
       about a financed goal. With inflateGoals on, goalCostAt already returns
       the aged amount, so this is the inflated figure and inflationGap
       correctly collapses to zero. Guarded by a test, not a comment. */
    const requiredToday = goalRequiredToday(g, goalCostAt(plan, g, age0));
    const fullCostToday = num(g.amount);

    const inflationUsed = goalInflationRate(plan, g, {
      inflationRate, useAppreciationForAssets: useAppreciation,
    });
    const requiredInflated = (!plan.inflateGoals && yearsAway > 0)
      ? requiredToday * Math.pow(1 + inflationUsed / 100, yearsAway)
      : requiredToday;

    let status = "funded";
    if (age > lastAge) status = "outOfHorizon";
    else if (age < age0) status = "inThePast";

    return {
      id: g.id, name: g.name, emoji: g.emoji, age, hasLoan: !!g.hasLoan,
      yearsAway, inflationUsed, fullCostToday, requiredToday, requiredInflated,
      projectedAvailable: null,
      engineGap: 0, inflationGap: requiredInflated - requiredToday,
      gap: 0, fundedPct: 1, status,
    };
  });

  /* ── 2. How much of each goal the projection actually funded ───────────── */
  /* The engine draws twice per year, in order: d1 for the cash shortfall, then
     d2 for goals, and records only their sum as unfundedThisYear. The ordering
     still gives an exact identity.

     If d1 left anything unfunded the portfolio was already empty, so
     d2.unfunded is the whole goal cost and unfundedThisYear >= goalCost. If d1
     was fully funded then unfundedThisYear IS d2.unfunded, which is
     <= goalCost. Either way:

         goalUnfunded = min(unfundedThisYear, goalCost)

     This matters beyond elegance: drawFromBuckets is NOT additive when
     per-bucket exit-tax rates differ within a tier (one draw of X raises a
     different amount than two draws summing to X), so re-deriving per-goal
     funding by splitting the engine's draw would change real users' numbers.
     The v1-goals-heavy snapshot carries a crypto exitTax override to catch
     exactly that. */
  const inHorizon = goals.filter((g) => g.status !== "outOfHorizon" && g.status !== "inThePast");
  const byAge = new Map();
  for (const g of inHorizon) {
    if (!byAge.has(g.age)) byAge.set(g.age, []);
    byAge.get(g.age).push(g);
  }

  for (const [age, list] of byAge) {
    const row = rowByAge.get(age);
    if (!row) continue;
    const goalCost = num(row.goalCost);
    const unfunded = Math.min(num(row.unfundedThisYear), goalCost);
    let pool = Math.max(0, goalCost - unfunded);

    /* Same-age goals fund in plan.goals array order — the order the user
       listed them. Not by amount, and explicitly not a new `priority` field:
       array order is stable, visible, and already user-controllable by
       reordering the goal list. */
    for (const g of list) {
      const take = Math.min(pool, g.requiredToday);
      pool -= take;
      g.projectedAvailable = take;

      /* funded% and gap answer the PORTFOLIO question — did the plan cover
         what it was asked to pay? — and are measured against what the engine
         actually charged. Dividing by requiredInflated instead would mark
         every goal underfunded purely because the plan prices in today's
         rupees, which reads as "you cannot afford this" when the real message
         is "your plan is charging the wrong number". Those are different
         problems with different fixes, so they stay in different fields:
         inflationGap carries the pricing story.

         With inflateGoals on, requiredToday IS the inflated cost and the two
         converge — which is the point of the toggle. */
      g.engineGap = Math.max(0, g.requiredToday - take);
      g.gap = g.engineGap;
      g.fundedPct = g.requiredToday > 0 ? Math.min(1, take / g.requiredToday) : 1;
      g.status = g.gap <= 1 ? "funded" : (take > 1 ? "partial" : "unfunded");
    }
  }

  /* ── 3. The requirement series ─────────────────────────────────────────── */
  /* Goals STRICTLY AFTER the row. row.netWorth is recorded at step 8, after
     step 7 has already paid that year's goal, so including the goal at age `a`
     would draw a spurious gap of exactly one goal's size at every goal age.

         required(a) = Σ  requiredInflated(g) / (1 + d)^(g.age − a)
                      g.age > a

     "The corpus you must hold at age a, in age-a rupees, to fund everything
     still ahead." One backward pass, O(rows + goals). */
  const dueAt = new Map();
  for (const g of inHorizon) {
    dueAt.set(g.age, (dueAt.get(g.age) ?? 0) + g.requiredInflated);
  }

  const n = rows.length;
  const dfac = 1 + discountRate / 100;
  const req = new Array(n).fill(0);
  const reqFV = new Array(n).fill(0);
  for (let i = n - 2; i >= 0; i--) {
    const dueNext = dueAt.get(rows[i + 1].age) ?? 0;
    req[i] = dfac > 0 ? (req[i + 1] + dueNext) / dfac : req[i + 1] + dueNext;
    reqFV[i] = reqFV[i + 1] + dueNext;
  }

  const series = rows.map((r, i) => {
    const projected = num(r.netWorth);
    const required = req[i];
    return {
      age: r.age,
      projected,
      required,
      requiredFV: reqFV[i],
      /* Derived here so the chart stays dumb: an invisible floor plus a band
         on top of it is all Recharts needs to shade the gap declaratively. */
      floor: Math.min(projected, required),
      gapHeight: Math.max(0, required - projected),
    };
  });

  /* ── 4. Totals ─────────────────────────────────────────────────────────── */
  const sum = (k) => inHorizon.reduce((s, g) => s + g[k], 0);
  const requiredInflated = sum("requiredInflated");
  const requiredTodayTotal = sum("requiredToday");
  const funded = inHorizon.reduce((s, g) => s + (g.projectedAvailable ?? 0), 0);

  let worstGapAge = null;
  let worst = 0;
  for (const p of series) {
    if (p.gapHeight > worst) { worst = p.gapHeight; worstGapAge = p.age; }
  }

  /* The age from which the corpus stays at or above the requirement line for
     good.

     A gap in the early years is the normal shape of saving, not a failure —
     you have not put the money in yet — so "widest shortfall at 28" is alarming
     and useless on a plan that funds everything. The crossover is the number
     worth saying out loud: when the plan stops being behind. null means it
     never catches up. */
  let crossoverAge = null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].gapHeight > 1) break;
    crossoverAge = series[i].age;
  }

  return {
    goals,
    series,
    totals: {
      requiredToday: requiredTodayTotal,
      requiredInflated,
      funded,
      engineGap: sum("engineGap"),
      inflationGap: sum("inflationGap"),
      gap: sum("gap"),
      fundedPct: requiredTodayTotal > 0 ? Math.min(1, funded / requiredTodayTotal) : 1,
    },
    inflationRate,
    discountRate,
    worstGapAge,
    crossoverAge,
    /* Two different verdicts, deliberately kept apart.

       allFunded    — the plan paid everything it was asked to pay.
       coversRealCost — the corpus stays at or above the REAL (target-age) cost
                      of everything still ahead, for every year. With
                      inflateGoals off these can disagree, and that disagreement
                      is exactly the thing the user needs told: "your plan
                      funds its goals, but at the wrong prices". */
    allFunded: inHorizon.every((g) => g.gap <= 1),
    coversRealCost: crossoverAge != null,
    hasGoals: inHorizon.length > 0,
  };
}

/* Re-exported so callers that already import this module can cross-check
   against the engine's own view without reaching into projection.mjs. */
export { goalsDueAt };
