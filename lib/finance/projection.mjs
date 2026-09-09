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
