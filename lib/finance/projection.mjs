/* ═══════════════════════════════════════════════════════════════════════════
   PROJECTION ENGINE — v0

   Moved verbatim from the `simulation` useMemo in app/page.jsx (lines 478-651).
   The ONLY change is that closed-over React state is now read off a single
   `input` argument. The arithmetic is byte-for-byte identical.

   This function exists to be frozen. The golden snapshot in projection.test.mjs
   pins its output so that later work on the v1 bucket engine can be shown to
   change only what it intends to change. Do not "improve" anything here.
   ═══════════════════════════════════════════════════════════════════════════ */

import { toAnnual, CURRENT_YEAR } from "./format.mjs";
import { calcIncomeTax } from "./tax.mjs";
import { calcEMI, loanScheduleYearly } from "./loans.mjs";

export function runProjection(input) {
  const {
    currentAge, lifeExpectancy, incomes, monthlyExpense, inflationRate,
    lifestyleCreep, currentNW, monthlyInvestment, investmentStepUp,
    expectedXIRR, postRetireReturn, exitTaxRate, investSurplus, goals,
  } = input;

  const years = lifeExpectancy - currentAge;
  if (years <= 0) return { data: [], fiAge: null, peakNW: 0 };

  const data = [];
  let nw = currentNW;
  let annualExpense = monthlyExpense * 12;
  let targetAnnualInvestment = monthlyInvestment * 12;
  let fiAge = null;
  let peakNW = currentNW;

  // Pre-compute goal loan structures
  // Each goal with a loan spawns an EMI stream starting at goal.age
  const goalLoanState = goals.map((g) => {
    if (!g.hasLoan) return null;
    const dp = g.amount * (g.downPaymentPct / 100);
    const loanAmt = g.amount - dp;
    if (loanAmt <= 0) return null;
    const emi = calcEMI(loanAmt, g.loanRate, g.loanTenure);
    const balances = loanScheduleYearly(loanAmt, g.loanRate, g.loanTenure);
    return {
      goalId: g.id, goalAge: g.age, emoji: g.emoji,
      downPayment: dp, loanAmount: loanAmt,
      annualEMI: emi * 12, tenure: g.loanTenure, balances,
      appreciationRate: g.appreciationRate || 0,
      maintenancePct: g.maintenancePct || 0,
      assetValue: g.amount, // initial asset value for appreciating goals
    };
  }).filter(Boolean);

  for (let y = 0; y <= years; y++) {
    const age = currentAge + y;
    const calendarYear = CURRENT_YEAR + y;

    // ── Gross income ──
    let grossIncome = 0;
    incomes.forEach((inc) => {
      if (age < inc.retireAge) {
        grossIncome += toAnnual(inc.amount, inc.frequency) * Math.pow(1 + inc.growthRate / 100, y);
      }
    });
    const isRetired = incomes.every((inc) => age >= inc.retireAge);

    // ── Fix 4: Income tax (new regime) ──
    const incomeTax = isRetired ? 0 : calcIncomeTax(grossIncome);
    const postTaxIncome = grossIncome - incomeTax;

    // ── Module 2: Return rate ──
    const returnRate = isRetired ? postRetireReturn : expectedXIRR;

    // ── Grow expenses ──
    if (y > 0) annualExpense *= 1 + (inflationRate + lifestyleCreep) / 100;

    // ── Grow target investment ──
    if (y > 0) targetAnnualInvestment *= 1 + investmentStepUp / 100;

    // ── Process goal events & loans ──
    let totalEMI = 0;
    let maintenanceCost = 0;
    let totalPropertyValue = 0;
    let totalLoanOutstanding = 0;
    let goalCostNet = 0;
    let goalCostGross = 0;

    // Process each goal
    goals.forEach((g) => {
      // Goal trigger: deduct down payment (or full amount if no loan)
      if (g.age === age) {
        if (g.hasLoan) {
          // Deduct down payment, grossed up for tax
          const dp = g.amount * (g.downPaymentPct / 100);
          const grossDP = dp / (1 - exitTaxRate / 100);
          goalCostNet += dp;
          goalCostGross += grossDP;
        } else {
          // Full amount, grossed up for tax
          const gross = g.amount / (1 - exitTaxRate / 100);
          goalCostNet += g.amount;
          goalCostGross += gross;
        }
      }
    });

    // Active loan EMIs and property tracking
    goalLoanState.forEach((ls) => {
      const yearsElapsed = age - ls.goalAge;
      if (yearsElapsed < 0) return; // not yet purchased
      if (yearsElapsed < ls.tenure) {
        totalEMI += ls.annualEMI;
        totalLoanOutstanding += (ls.balances[yearsElapsed] || 0);
      }
      // Asset appreciation (for home-type goals)
      if (ls.appreciationRate > 0 && yearsElapsed >= 0) {
        const currentAssetVal = ls.assetValue * Math.pow(1 + ls.appreciationRate / 100, yearsElapsed);
        totalPropertyValue += currentAssetVal;
        // Module 3: Maintenance
        if (ls.maintenancePct > 0) {
          maintenanceCost += currentAssetVal * (ls.maintenancePct / 100);
        }
      }
    });

    // ═══ MODULE 1: Cash Flow Waterfall ═══
    const totalAnnualSpends = annualExpense + totalEMI + maintenanceCost;
    const availableCash = postTaxIncome - totalAnnualSpends;

    let actualInvestment = 0;
    let surplusSpent = 0;

    if (!isRetired) {
      if (investSurplus) {
        // Fix 1: Invest ALL surplus
        actualInvestment = Math.max(0, availableCash);
      } else {
        // Cap at target SIP
        actualInvestment = Math.max(0, Math.min(targetAnnualInvestment, availableCash));
        surplusSpent = Math.max(0, availableCash - actualInvestment);
      }
    }

    const deficit = availableCash < 0 && !isRetired;
    const constrained = !isRetired && !investSurplus && availableCash >= 0 && availableCash < targetAnnualInvestment;

    // ── Net Worth Update ──
    if (y === 0) {
      nw = nw + actualInvestment;
    } else if (!isRetired) {
      nw = nw * (1 + returnRate / 100) + actualInvestment;
      if (deficit) nw += availableCash;
    } else {
      nw = nw * (1 + returnRate / 100) - totalAnnualSpends;
    }

    // Deduct goals
    nw -= goalCostGross;

    const liquidNW = nw;
    // Net worth = liquid investments only (property assets excluded)
    const totalNW = liquidNW;

    // Fix 5: chart value clamped to 0 (simulation continues internally)
    const chartNW = Math.max(0, totalNW);

    peakNW = Math.max(peakNW, totalNW);

    if (!fiAge && liquidNW > 0 && totalAnnualSpends > 0 && liquidNW >= totalAnnualSpends * 25) {
      fiAge = age;
    }

    data.push({
      age, year: calendarYear,
      netWorth: Math.round(chartNW),
      netWorthRaw: Math.round(totalNW),
      liquidNW: Math.round(liquidNW),
      totalPropertyValue: Math.round(totalPropertyValue),
      totalLoanOutstanding: Math.round(totalLoanOutstanding),
      grossIncome: Math.round(grossIncome),
      incomeTax: Math.round(incomeTax),
      postTaxIncome: Math.round(postTaxIncome),
      annualExpense: Math.round(annualExpense),
      totalEMI: Math.round(totalEMI),
      maintenanceCost: Math.round(maintenanceCost),
      availableCash: Math.round(availableCash),
      targetInvestment: Math.round(isRetired ? 0 : targetAnnualInvestment),
      invested: Math.round(actualInvestment),
      surplusSpent: Math.round(surplusSpent),
      goalCost: Math.round(goalCostNet),
      goalCostGross: Math.round(goalCostGross),
      deficit, constrained, isRetired, returnRate,
    });
  }

  return { data, fiAge, peakNW: Math.max(0, peakNW) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROJECTION ENGINE — v1 (per-instrument buckets)

   Replaces the single net-worth scalar with nine instrument buckets, each with
   its own return and, for PPF/EPF/NPS, its own unlock age. Net worth is the sum
   of the buckets less anything that could not be funded.

   Ordering inside the year loop is not arbitrary. Each step sits where it does
   to prevent a specific way of counting the same rupee twice; the comments name
   which one. See BEHAVIOUR-NOTES.md for the deltas against the v0 engine.
   ═══════════════════════════════════════════════════════════════════════════ */

import {
  BUCKET_DEFS, LIQUID, LOCKED, PPF_MATURITY_OFFSET_YEARS,
  EPF_WITHDRAWAL_AGE, NPS_EXIT_AGE, DEFAULT_LOCKED_EXIT_TAX,
} from "./assumptions.mjs";
import { effectiveAge } from "./age.mjs";
import { annualPremium } from "./insurance.mjs";
import { buildContributionPlan, steppedContribution, plannedCashForYear } from "./contributions.mjs";
import { drawFromBuckets } from "./drawdown.mjs";

const EPS = 1;

const EMPTY_V1 = {
  data: [], fiAge: null, fiAgeSustained: null, peakNW: 0,
  openingPortfolio: 0, depletionAge: null,
};

const sumValues = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/* Opening balances. Exactly one assignment per rupee — this is what stops the
   named holdings and the legacy aggregate from both landing in the portfolio. */
export function openingBuckets(plan) {
  const h = plan.holdings ?? {};
  const li = plan.lifeInsurance ?? {};
  /* Only an eligible cash value is an asset. A sum assured is a death benefit
     paid to a nominee: protection, not wealth. When the headline figure is a
     sum assured we take the separately recorded surrender value, which stays
     null (treated as 0) when unknown rather than being inferred from cover. */
  const licCash = li.valueType === "surrenderValue"
    ? num(li.value)
    : num(li.surrenderValue);
  return {
    mf: num(h.mf), stocks: num(h.stocks), crypto: num(h.crypto),
    fdrd: num(h.fd) + num(h.rd),          // the intake sheet's single FD/RD figure
    ppf: num(h.ppf), epf: num(h.epf), nps: num(h.nps),
    lic: licCash,
    unallocated: num(h.unallocated),
  };
}

/* null in BUCKET_DEFS means "inherit the user's expectedXIRR", which is what
   keeps a migrated v0 profile behaving as it did: v0 applied one rate to the
   whole portfolio. */
export function bucketReturn(plan, b) {
  const override = plan.bucketOverrides?.[b]?.annualReturn;
  if (override !== undefined && override !== null) return num(override);
  const def = BUCKET_DEFS[b]?.defaultReturn;
  return def === null || def === undefined ? num(plan.expectedXIRR) : def;
}

/* Liquid buckets inherit the user's single exit-tax slider. Locked ones start
   at 0 because maturity treatment differs; both are user-editable and the UI
   states the simplification rather than asserting a per-instrument tax rule. */
export function buildExitTaxMap(plan) {
  const map = {};
  for (const b of Object.keys(BUCKET_DEFS)) {
    const o = plan.bucketOverrides?.[b]?.exitTax;
    map[b] = o !== undefined && o !== null
      ? num(o)
      : (BUCKET_DEFS[b].tier === LOCKED ? DEFAULT_LOCKED_EXIT_TAX : num(plan.exitTaxRate));
  }
  return map;
}

/* PPF's lock is tenure-based, not age-based: 15 years from the END of the
   financial year of opening. For a 28-year-old opening today that is age 44,
   not 60 — a 16-year difference that changes the answer materially. */
export function buildUnlockMap(plan, age0) {
  const thisYear = new Date().getFullYear();
  const opened = num(plan.ppfOpenedYear, thisYear);
  const map = {};
  for (const b of Object.keys(BUCKET_DEFS)) {
    const o = plan.bucketOverrides?.[b]?.unlockAge;
    if (o !== undefined && o !== null) { map[b] = num(o); continue; }
    if (BUCKET_DEFS[b].tier !== LOCKED) { map[b] = -Infinity; continue; }
    map[b] = BUCKET_DEFS[b].lock === "ppfTenure"
      ? age0 + (opened + PPF_MATURITY_OFFSET_YEARS - thisYear)
      : BUCKET_DEFS[b].lock === "age58" ? EPF_WITHDRAWAL_AGE : NPS_EXIT_AGE;
  }
  return map;
}

/* Precomputed loan structures, one per financed goal. Copied from the v0
   engine unchanged; only the EMI start year moved, in loanYear below. */
export function buildGoalLoanState(plan, age0) {
  const base = age0 ?? effectiveAge(plan);
  return (plan.goals ?? []).map((g) => {
    if (!g.hasLoan) return null;
    /* Must read the same cost goalsDueAt charges, or the down payment and the
       loan it implies would be priced in different years' rupees. Inflating
       assetValue with it is self-consistent: a property bought later costs
       more precisely because property appreciated. */
    const cost = goalCostAt(plan, g, base);
    const dp = cost * (num(g.downPaymentPct) / 100);
    const loanAmt = cost - dp;
    if (loanAmt <= 0) return null;
    return {
      goalId: g.id, goalAge: num(g.age), emoji: g.emoji,
      downPayment: dp, loanAmount: loanAmt,
      annualEMI: calcEMI(loanAmt, num(g.loanRate), num(g.loanTenure)) * 12,
      tenure: num(g.loanTenure),
      balances: loanScheduleYearly(loanAmt, num(g.loanRate), num(g.loanTenure)),
      appreciationRate: num(g.appreciationRate),
      maintenancePct: num(g.maintenancePct),
      assetValue: cost,
    };
  }).filter(Boolean);
}

/* EMIs start the year AFTER purchase. Charging a full year of EMI in the same
   year as the down payment overcharges roughly one year of EMI per loan — a v0
   bug that was invisible before the cash-flow waterfall exposed it. */
export function loanYear(goalLoanState, age) {
  let totalEMI = 0, maintenanceCost = 0, totalPropertyValue = 0, totalLoanOutstanding = 0;
  for (const ls of goalLoanState) {
    const elapsed = age - ls.goalAge;
    if (elapsed < 0) continue;
    if (elapsed >= 1 && elapsed <= ls.tenure) {
      totalEMI += ls.annualEMI;
      totalLoanOutstanding += ls.balances[elapsed - 1] || 0;
    }
    if (ls.appreciationRate > 0) {
      const v = ls.assetValue * Math.pow(1 + ls.appreciationRate / 100, elapsed);
      totalPropertyValue += v;
      maintenanceCost += v * (ls.maintenancePct / 100);
    }
  }
  return { totalEMI, maintenanceCost, totalPropertyValue, totalLoanOutstanding };
}

/* What one goal demands of the portfolio, in TODAY's rupees: the down payment
   when financed, the full cost otherwise. The loan principal is never a demand
   on the portfolio — it becomes an EMI stream charged against available cash,
   so counting it here would double it against its own EMIs.

   Extracted so goalgap.mjs prices a goal the same way the engine charges it.
   Two copies of this rule drifting apart is the one way that surface can lie. */
export const goalRequiredToday = (g, amount) => {
  const cost = amount ?? num(g?.amount);
  return g?.hasLoan ? cost * (num(g.downPaymentPct) / 100) : cost;
};

/* Which rate ages a goal's price. A goal carrying appreciationRate is priced
   up at that rate rather than general inflation — the engine already applies
   appreciationRate to the asset AFTER purchase (loanYear), never to the
   purchase price, so this reuses a number the user set rather than inventing
   one, and it is not double-counting. */
export function goalInflationRate(plan, g, opts = {}) {
  const useAppreciation = opts.useAppreciationForAssets !== false;
  const appreciation = num(g?.appreciationRate);
  if (useAppreciation && appreciation > 0) return appreciation;
  return num(opts.inflationRate ?? plan?.inflationRate);
}

/* What a goal costs in the rupees of the year it is paid.

   With plan.inflateGoals off this is the amount as entered — the behaviour
   every saved profile was projected with, so the default changes nothing. With
   it on, the amount is aged to the target year at goalInflationRate. The Goal
   Gap chart calls the same helper, which is what stops the two screens
   disagreeing about what a goal costs. */
export function goalCostAt(plan, g, age0) {
  const amount = num(g?.amount);
  if (!plan?.inflateGoals) return amount;
  const years = num(g?.age) - num(age0 ?? effectiveAge(plan));
  if (!(years > 0)) return amount;
  return amount * Math.pow(1 + goalInflationRate(plan, g) / 100, years);
}

/* Cash due for goals landing on this exact age. NET — drawFromBuckets applies
   the gross-up. */
export const goalsDueAt = (plan, age, age0) => (plan.goals ?? [])
  .filter((g) => num(g.age) === age)
  .reduce((s, g) => s + goalRequiredToday(g, goalCostAt(plan, g, age0)), 0);

export const firstHomeGoalAge = (plan) => Math.min(
  Infinity, ...(plan.goals ?? []).filter((g) => g.emoji === "home").map((g) => num(g.age)));

const tierSum = (B, tier) => Object.keys(B)
  .filter((b) => BUCKET_DEFS[b]?.tier === tier)
  .reduce((s, b) => s + B[b], 0);

/* Weighted by balance, so the read-out reflects the mix actually held rather
   than an average of rates the user has no money in. */
export function blendedReturn(plan, B) {
  const total = sumValues(B);
  if (total <= EPS) return num(plan.expectedXIRR);
  return Object.keys(B).reduce((s, b) => s + B[b] * bucketReturn(plan, b), 0) / total;
}

const minUnlockAgeHoldingMoney = (B, unlockAge) => Math.min(Infinity,
  ...Object.keys(B)
    .filter((b) => BUCKET_DEFS[b]?.tier === LOCKED && B[b] > EPS)
    .map((b) => unlockAge[b]));

/* What the liquid pool must hold today to cover an inflating spend until the
   locked money unlocks. */
function pvOfSpend(annualSpend, years, growthPct, discountPct) {
  const g = growthPct / 100;
  const r = discountPct / 100;
  let pv = 0;
  for (let i = 0; i < years; i++) {
    pv += (annualSpend * Math.pow(1 + g, i)) / Math.pow(1 + r, i);
  }
  return pv;
}

/* `opts.returnFor(bucket, yearIndex)` optionally supplies the annual return for
   one bucket in one year, replacing the static bucketReturn lookup inside the
   growth step. It exists for the Success Score simulation, which needs a fresh
   draw per year: perturbing plan.bucketOverrides instead would hold one return
   constant across the whole horizon, forcing every published annual sigma to be
   divided by the square root of the horizon length — a fudge that silently
   changes meaning whenever lifeExpectancy moves.

   It is called as returnFor(bucket, yearIndex, { working, age }) and its
   result is used as-is: the post-retirement cap is NOT applied on top, because
   capping a random draw is one-sided and would drain every simulated
   retirement. A caller that wants the cap applies it itself, which is what
   `working` is for.

   With no opts, every read falls through to bucketReturn(plan, b) plus the cap
   and the result is identical to the call before this parameter existed. That
   is asserted in projection-opts.test.mjs, not assumed. */
export function runProjectionV1(plan, opts) {
  if (!plan || typeof plan !== "object") return { ...EMPTY_V1 };

  const age0 = effectiveAge(plan);
  const years = num(plan.lifeExpectancy) - age0;
  if (!Number.isFinite(years) || years < 0) return { ...EMPTY_V1 };

  const retireAt = num(plan.retirementAge, 60);
  const exitTax = buildExitTaxMap(plan);
  const unlockAge = buildUnlockMap(plan, age0);
  const drawCtx = { exitTax, unlockAge };
  const cplan = buildContributionPlan(plan);
  const goalLoanState = buildGoalLoanState(plan, age0);
  const homeAge = firstHomeGoalAge(plan);

  const B = openingBuckets(plan);
  const openingPortfolio = sumValues(B);

  /* Deliberately NOT threaded into blendedReturn (which feeds the FI bridge and
     each row's returnRate). Those report the planning assumption; the success
     criterion reads neither, and leaving them alone keeps this to one call
     site. Noted in BEHAVIOUR-NOTES.md. */
  const rateFor = opts?.returnFor;

  const livingBase = (num(plan.expenses?.household) + num(plan.expenses?.rent)) * 12;
  const rentBase = num(plan.expenses?.rent) * 12;
  const premiumBase = annualPremium(plan.medical).total;

  const data = [];
  let cumUnfunded = 0;
  let depletionAge = null;
  let peakNW = openingPortfolio;
  let fiAge = null;
  const fiFlags = [];

  for (let y = 0; y <= years; y++) {
    const age = age0 + y;
    const working = age < retireAt;

    /* 1. GROWTH — skipped at y=0 because no time has elapsed. This preserves
          the v0 convention that the first year does not compound, so the first
          chart point equals the opening holdings. */
    if (y > 0) {
      for (const b of Object.keys(B)) {
        let r;
        if (opts?.returnFor) {
          /* A supplied return source owns the rate outright, retirement
             adjustment included — it is handed `working` to do that with.

             The post-retirement cap below must NOT be layered on top of a
             random draw: it is one-sided, so a good year gets clipped to the
             conservative assumption while a bad year falls through untouched.
             Every simulated retirement would then bleed out by construction,
             and a plan the projection says ends with 80 Cr would score 15%. */
          r = rateFor(b, y, { working, age });
        } else {
          r = bucketReturn(plan, b);
          /* A CAP, not an override: a contractual PPF or EPF rate should not be
             silently downgraded to the post-retirement assumption. */
          if (!working) r = Math.min(r, num(plan.postRetireReturn));
        }
        B[b] *= 1 + r / 100;
      }
    }

    /* 2. INCOME AND TAX — one slab pass over the SUMMED gross pool. Summing
          calcIncomeTax per source would grant the standard deduction, the nil
          slab and the rebate once per source: two 12L sources would show zero
          tax instead of ~2.6L. */
    let grossPool = 0, netPool = 0;
    for (const inc of plan.incomes ?? []) {
      if (age >= num(inc.retireAge)) continue;
      const amt = toAnnual(num(inc.amount), inc.frequency) *
                  Math.pow(1 + num(inc.growthRate) / 100, y);
      if (inc.basis === "takehome") netPool += amt; else grossPool += amt;
    }
    const incomeTax = calcIncomeTax(grossPool);
    const postTaxIncome = grossPool - incomeTax + netPool;

    /* 3. OBLIGATIONS */
    const infl = Math.pow(1 + (num(plan.inflationRate) + num(plan.lifestyleCreep)) / 100, y);
    let livingCost = livingBase * infl;
    /* Rent stops once the home is bought, otherwise the plan pays rent and an
       EMI on the same home for life. */
    if (plan.stopRentOnHomePurchase && age >= homeAge) livingCost -= rentBase * infl;
    const insurancePremium = premiumBase * Math.pow(1 + num(plan.medicalInflation) / 100, y);
    const { totalEMI, maintenanceCost, totalPropertyValue, totalLoanOutstanding } =
      loanYear(goalLoanState, age);
    const spends = livingCost + insurancePremium + totalEMI + maintenanceCost;
    const availableCash = postTaxIncome - spends;

    /* 4. PAYROLL-FUNDED CREDITS — never capped by available cash. An EPF
          deduction happens inside payroll whether or not there is a surplus,
          and it was never in take-home pay to begin with. */
    let payrollContribution = 0;
    if (working) {
      for (const it of cplan.items) {
        if (!it.fundedFromPayroll) continue;
        const amt = steppedContribution(it, y);
        B[it.bucket] += amt * it.assetFactor;
        payrollContribution += amt;
      }
    }

    /* 5. CASH CONTRIBUTIONS — capped by what is actually available. Any gap is
          reported as a shortfall rather than silently assumed to be funded. */
    const plannedCash = working ? plannedCashForYear(cplan, plan, y) : 0;
    const actualCash = Math.min(plannedCash, Math.max(0, availableCash));
    const contributionShortfall = Math.max(0, plannedCash - actualCash);
    const scale = plannedCash > EPS ? actualCash / plannedCash : 0;
    if (working) {
      if (cplan.useDetailed) {
        for (const it of cplan.items) {
          if (it.fundedFromPayroll) continue;
          B[it.bucket] += steppedContribution(it, y) * scale * it.assetFactor;
        }
      } else {
        B[plan.surplusBucket ?? "mf"] += actualCash;
      }
    }

    /* 6. SURPLUS — only what is LEFT after contributions. Using availableCash
          here would invest every contributed rupee a second time. */
    const leftover = Math.max(0, availableCash - actualCash);
    let surplusSpent = 0;
    let surplusInvested = 0;
    if (plan.investSurplus && working) {
      B[plan.surplusBucket ?? "mf"] += leftover;
      surplusInvested = leftover;
    } else {
      surplusSpent = leftover;
    }

    /* 7. SHORTFALLS AND GOALS — both draw through the same pro-rata path, so
          exit tax applies uniformly and no bucket can go negative. v0 subtracted
          a living-expense shortfall raw while grossing up goals, and let a
          depleted portfolio compound negatively out of sight of the chart. */
    const cashShortfall = Math.max(0, -availableCash);
    const d1 = drawFromBuckets(B, cashShortfall, age, drawCtx);
    const goalNet = goalsDueAt(plan, age, age0);
    const d2 = drawFromBuckets(B, goalNet, age, drawCtx);
    const unfundedThisYear = d1.unfunded + d2.unfunded;
    cumUnfunded += unfundedThisYear;
    if (cumUnfunded > EPS && depletionAge === null) depletionAge = age;

    /* 8. RECORD */
    const liquidNW = tierSum(B, LIQUID);
    const lockedNW = tierSum(B, LOCKED);
    const totalNW = liquidNW + lockedNW - cumUnfunded;
    peakNW = Math.max(peakNW, totalNW);

    /* FI: can I bridge to the unlock date, AND is the whole thing big enough?
       recurringSpend excludes EMIs, which terminate — including them made FI
       appear to "arrive" the year a loan ended rather than when wealth grew. */
    const recurringSpend = livingCost + insurancePremium + maintenanceCost;
    const unlockAt = minUnlockAgeHoldingMoney(B, unlockAge);
    const yearsToUnlock = Number.isFinite(unlockAt) ? Math.max(0, unlockAt - age) : 0;
    const bridgeNeed = pvOfSpend(
      recurringSpend, yearsToUnlock,
      num(plan.inflationRate) + num(plan.lifestyleCreep),
      blendedReturn(plan, B));
    const isFI = recurringSpend > 0 && liquidNW >= bridgeNeed &&
                 (liquidNW + lockedNW) >= 25 * recurringSpend;
    fiFlags.push(isFI);
    if (fiAge === null && isFI) fiAge = age;

    const blended = blendedReturn(plan, B);
    data.push({
      age, year: CURRENT_YEAR + y,
      netWorth: Math.round(Math.max(0, totalNW)),
      netWorthRaw: Math.round(totalNW),
      liquidNW: Math.round(liquidNW),
      lockedNW: Math.round(lockedNW),
      buckets: Object.fromEntries(Object.entries(B).map(([k, v]) => [k, Math.round(v)])),
      totalPropertyValue: Math.round(totalPropertyValue),
      totalLoanOutstanding: Math.round(totalLoanOutstanding),
      grossIncome: Math.round(grossPool + netPool),
      incomeTax: Math.round(incomeTax),
      postTaxIncome: Math.round(postTaxIncome),
      annualExpense: Math.round(livingCost),
      insurancePremium: Math.round(insurancePremium),
      totalEMI: Math.round(totalEMI),
      maintenanceCost: Math.round(maintenanceCost),
      availableCash: Math.round(availableCash),
      targetInvestment: Math.round(plannedCash),
      plannedContribution: Math.round(plannedCash + payrollContribution),
      actualContribution: Math.round(actualCash + payrollContribution),
      contributionShortfall: Math.round(contributionShortfall),
      payrollContribution: Math.round(payrollContribution),
      invested: Math.round(actualCash + payrollContribution + surplusInvested),
      surplusSpent: Math.round(surplusSpent),
      goalCost: Math.round(goalNet),
      goalCostGross: Math.round(d2.grossSold),
      unfundedThisYear: Math.round(unfundedThisYear),
      cumUnfunded: Math.round(cumUnfunded),
      blendedReturn: blended,
      deficit: availableCash < 0,
      constrained: contributionShortfall > EPS,
      isRetired: !working,
      returnRate: blended,
    });
  }

  /* The first age from which FI holds in EVERY later year. A plan that reaches
     25x at 47 and then spends the corpus on a goal at 50 was never independent
     at 47, but the latched fiAge says it was. */
  let fiAgeSustained = null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (fiFlags[i]) fiAgeSustained = data[i].age; else break;
  }

  return {
    data, fiAge, fiAgeSustained, peakNW: Math.max(0, peakNW),
    openingPortfolio, depletionAge,
  };
}
