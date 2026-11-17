/* ═══════════════════════════════════════════════════════════════════════════
   FIRST RUN

   The plan a new visitor starts from, and the test of whether the current
   plan has moved away from it. The Home control (the header logo) asks this
   before it resets anything: an untouched plan goes straight home, a changed
   one is confirmed first.

   The v0 profile goes through the migration chain, then fresh-run financial
   inputs are cleared so a new visitor enters their own figures. New users also
   get future-priced goals and only the entered SIP invested (see schema.mjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import { migrate } from "./migrate.mjs";
import { FIRST_RUN_V0 } from "./schema.mjs";

export const firstRunPlan = () => {
  const plan = migrate(FIRST_RUN_V0);
  // A new visitor should enter their own figures instead of inheriting the
  // sample values embedded in FIRST_RUN_V0. Timeline values, amounts and rate
  // assumptions start at zero; validation asks for a real age before planning.
  for (const income of plan.incomes) {
    income.amount = 0;
    income.growthRate = 0;
  }
  plan.currentAge = 0;
  plan.lifeExpectancy = 0;
  plan.retirementAge = 0;
  plan.expenses.household = 0;
  plan.expenses.rent = 0;
  plan.inflationRate = 0;
  plan.lifestyleCreep = 0;
  plan.postRetireInflation = 0;
  plan.holdings = Object.fromEntries(Object.keys(plan.holdings).map((key) => [key, 0]));
  plan.legacy.monthlyInvestment = 0;
  plan.investmentStepUp = 0;
  plan.expectedXIRR = 0;
  plan.postRetireReturn = 0;
  plan.exitTaxRate = 0;
  plan.goals = [];

  const zeroContributionInputs = (person) => {
    for (const contribution of Object.values(person.contributions ?? {})) {
      if (!contribution || typeof contribution !== "object" || Array.isArray(contribution)) continue;
      contribution.amount = 0;
      contribution.annualReturn = 0;
      contribution.stepUp = 0;
    }
  };
  zeroContributionInputs(plan);
  for (const member of plan.members ?? []) zeroContributionInputs(member);

  return { ...plan, inflateGoals: true, investSurplus: false };
};

/* Structural equality that ignores key order: a plan reloaded from the local
   draft passes back through migrate(), which can rebuild objects with their
   keys in a different order but the same contents. */
export function sameData(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => sameData(v, b[i]));
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && sameData(a[k], b[k]));
}

/* True once anything in the plan differs from the first-run plan: a typed
   name, a moved slider, an added or deleted goal. Changing a value and then
   changing it back leaves nothing to lose, and reads as untouched. */
export const hasEnteredData = (plan) => !sameData(plan, firstRunPlan());
