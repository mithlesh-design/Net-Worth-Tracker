/* ═══════════════════════════════════════════════════════════════════════════
   LIFE INSURANCE POLICIES

   Every policy, whatever its type, reduces to three cash flows read on its
   owner's age:

     premium   — paid every year until premiumUntilAge          (money out)
     income    — annualIncome each year from incomeStartAge to
                 incomeEndAge, both INCLUSIVE ("45–55" is eleven
                 payments, which is how people read it)          (money in)
     maturity  — one lump sum at maturityAge                     (money in)

   The type only decides which of those a user is asked for:

     term, no return      premium only. The sum assured is paid on death, so it
                          is protection, never a cash flow and never wealth.
     term, return of      premium, then every premium back at maturityAge. The
       premium            amount is derived — annual premium × years paid, from
                          startAge — rather than typed, because it is fixed by
                          the policy, not estimated.
     endowment            premium, optional annual income, maturity amount.
     ulip                 same fields as endowment. Its maturity amount is the
                          user's estimate; a ULIP's real value is market-linked.

   Premiums are flat, in today's rupees, like medical premiums. Nothing here
   inflates: the amounts are what the policy document says.

   There is no surrender or cash value. A policy's value is counted when it is
   paid out — the income and maturity above — so counting a cash value as well
   would count the same money twice.
   ═══════════════════════════════════════════════════════════════════════════ */

import { toAnnual } from "./format.mjs";
import { effectiveAge } from "./age.mjs";
import { includedPeople, personPlan, personAge, personLabel, hasMembers } from "../household/members.mjs";

export const POLICY_TYPES = ["term", "endowment", "ulip"];

export const POLICY_TYPE_LABELS = {
  term: "Term Insurance",
  endowment: "Endowment",
  ulip: "ULIP",
};

const num = (v, d = 0) => {
  if (v === null || v === undefined || v === "") return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/* A new policy, opening on sensible ages for someone of `age` retiring at
   `retirementAge`. Every field exists on every policy whatever its type, so
   switching type keeps what was typed rather than dropping it. */
export function newPolicy(id, { age = 30, retirementAge = 60, type = "term" } = {}) {
  const until = Math.max(num(age) + 1, num(retirementAge, 60));
  return {
    id,
    name: "",
    type: POLICY_TYPES.includes(type) ? type : "term",
    sumAssured: 0,
    premium: 0,
    premiumFrequency: "yearly",
    premiumUntilAge: until,
    returnOfPremium: false,
    startAge: num(age),
    maturityAge: until,
    maturityAmount: 0,
    hasIncome: false,
    annualIncome: 0,
    incomeStartAge: until,
    incomeEndAge: until,
  };
}

export const annualPolicyPremium = (p) =>
  toAnnual(num(p?.premium), p?.premiumFrequency || "yearly");

/* Which cash flows this policy actually has, by type. One place, so the
   engine, the timeline and the form cannot disagree about what a ULIP pays. */
export const paysMaturity = (p) =>
  p?.type === "endowment" || p?.type === "ulip" || (p?.type === "term" && !!p.returnOfPremium);

export const paysIncome = (p) =>
  (p?.type === "endowment" || p?.type === "ulip") && !!p.hasIncome;

/* Years of premium a return-of-premium policy hands back. */
export const premiumYears = (p) =>
  Math.max(0, num(p?.premiumUntilAge) - num(p?.startAge));

/* The lump sum at maturity. For a return-of-premium term plan it is every
   premium paid, derived from the premium and the paying years. */
export function maturityAmount(p) {
  if (!paysMaturity(p)) return 0;
  if (p.type === "term") return annualPolicyPremium(p) * premiumYears(p);
  return num(p.maturityAmount);
}

/* One year of one policy at its owner's age. */
export function policyYear(p, age) {
  const premium = age < num(p?.premiumUntilAge) ? annualPolicyPremium(p) : 0;
  const income = paysIncome(p) && age >= num(p.incomeStartAge) && age <= num(p.incomeEndAge)
    ? num(p.annualIncome)
    : 0;
  const maturity = paysMaturity(p) && age === num(p.maturityAge) ? maturityAmount(p) : 0;
  return { premium, income, maturity };
}

/* All of one person's policies for a year. */
export function policiesYear(policies, age) {
  const out = { premium: 0, income: 0, maturity: 0 };
  for (const p of Array.isArray(policies) ? policies : []) {
    const y = policyYear(p, age);
    out.premium += y.premium;
    out.income += y.income;
    out.maturity += y.maturity;
  }
  return out;
}

export const policyLabel = (p) =>
  String(p?.name ?? "").trim() || POLICY_TYPE_LABELS[p?.type] || "Life insurance";

/* The dated money-in events a timeline should show, on the owner's age:
   one for each maturity, and one for the start of each income stream (with its
   end, so a caption can say "45–55"). Ages outside [fromAge, toAge] are
   dropped — a policy maturing past the horizon never reaches the plan. */
export function policyEvents(policies, { fromAge = -Infinity, toAge = Infinity } = {}) {
  const events = [];
  for (const p of Array.isArray(policies) ? policies : []) {
    if (paysIncome(p) && num(p.annualIncome) > 0) {
      const start = num(p.incomeStartAge);
      if (start >= fromAge && start <= toAge) {
        events.push({
          kind: "income", policyId: p.id, label: policyLabel(p),
          age: start, endAge: num(p.incomeEndAge), amount: num(p.annualIncome),
        });
      }
    }
    const amount = maturityAmount(p);
    const at = num(p.maturityAge);
    if (amount > 0 && at >= fromAge && at <= toAge) {
      events.push({ kind: "maturity", policyId: p.id, label: policyLabel(p), age: at, amount });
    }
  }
  return events.sort((a, b) => a.age - b.age);
}

/* Every included person's policy events, on YOUR age — the axis the household
   chart is drawn on. A parent's maturity at their 70 lands where you are 42.
   Each event names its owner when there is more than one person, so the chart
   never shows someone else's payout as yours. */
export function householdPolicyEvents(plan) {
  const age0 = effectiveAge(plan);
  const horizon = Number(plan?.lifeExpectancy) - age0;
  if (!Number.isFinite(horizon) || horizon < 0) return [];
  const named = hasMembers(plan);
  const out = [];
  for (const person of includedPeople(plan)) {
    const theirAge = personAge(plan, person.id);
    const offset = theirAge - age0;
    const pp = personPlan(plan, person.id);
    for (const e of policyEvents(pp?.lifePolicies, { fromAge: theirAge, toAge: theirAge + horizon })) {
      out.push({
        ...e,
        key: `${person.id}:${e.policyId}:${e.kind}`,
        age: e.age - offset,
        endAge: e.endAge === undefined ? undefined : e.endAge - offset,
        ownerAge: e.age,
        owner: named ? personLabel(plan, person.id) : null,
      });
    }
  }
  return out.sort((a, b) => a.age - b.age);
}
