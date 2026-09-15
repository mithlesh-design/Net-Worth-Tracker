/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE VALIDATION

   Returns an array of findings; never throws. Two consumers:
     - the UI, which renders each finding inside the card that owns the field
     - the engine, which uses `clampPlan` so that a hand-edited saved profile
       cannot produce Infinity or NaN in the projection

   applySettings previously wrote whatever was in the stored JSON straight into
   React state, with no defences anywhere downstream. An exitTaxRate of 100
   turns the goal gross-up into a division by zero.
   ═══════════════════════════════════════════════════════════════════════════ */

import { ageFromDob } from "../finance/age.mjs";
import { PPF_ANNUAL_CAP } from "../finance/assumptions.mjs";
import { toAnnual } from "../finance/format.mjs";
import { NAMED_CONTRIBUTIONS } from "./schema.mjs";

const ERROR = "error";
const WARN = "warning";

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/* `?? []` is not enough: a stored profile can carry a string where an array is
   expected, and a string has no .forEach. */
const asArray = (v) => (Array.isArray(v) ? v : []);
const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

/* Exit tax must stay below 100 or `amount / (1 - t)` diverges. */
export const MAX_EXIT_TAX = 95;
export const MAX_AGE = 120;

export function validate(plan) {
  const out = [];
  const add = (path, message, severity = ERROR) => out.push({ path, message, severity });

  if (!plan || typeof plan !== "object") {
    return [{ path: "", message: "Profile could not be read.", severity: ERROR }];
  }

  /* ── Personal ── */
  const dob = plan.personal?.dob;
  if (dob) {
    const age = ageFromDob(dob);
    if (age === null) {
      add("personal.dob", "Enter a valid date of birth.");
    } else if (age < 0) {
      add("personal.dob", "Date of birth cannot be in the future.");
    } else if (age > MAX_AGE) {
      add("personal.dob", `Date of birth implies an age over ${MAX_AGE} years.`);
    } else if (isNum(plan.lifeExpectancy) && age >= plan.lifeExpectancy) {
      add("personal.dob", "Age from date of birth is at or past the life expectancy.");
    }
  }

  /* ── Timeline ordering ── */
  const age = ageFromDob(dob) ?? plan.currentAge;
  if (!isNum(age)) add("currentAge", "Enter a current age.");
  if (!isNum(plan.lifeExpectancy)) add("lifeExpectancy", "Enter a life expectancy.");
  if (isNum(age) && isNum(plan.lifeExpectancy) && plan.lifeExpectancy <= age) {
    add("lifeExpectancy", "Life expectancy must be greater than your current age.");
  }
  if (isNum(plan.retirementAge)) {
    if (isNum(age) && plan.retirementAge < age) {
      add("retirementAge", "Retirement age is before your current age.", WARN);
    }
    if (isNum(plan.lifeExpectancy) && plan.retirementAge > plan.lifeExpectancy) {
      add("retirementAge", "Retirement age is after your life expectancy.");
    }
  }

  /* ── Rates ── */
  const pct = (path, value, min, max, label) => {
    if (value === null || value === undefined) return;
    if (!isNum(value)) return add(path, `${label} must be a number.`);
    if (value < min || value > max) add(path, `${label} must be between ${min}% and ${max}%.`);
  };
  pct("inflationRate", plan.inflationRate, 0, 50, "Inflation");
  pct("lifestyleCreep", plan.lifestyleCreep, 0, 50, "Lifestyle creep");
  pct("expectedXIRR", plan.expectedXIRR, -50, 50, "Expected return");
  pct("postRetireReturn", plan.postRetireReturn, -50, 50, "Post-retirement return");
  pct("investmentStepUp", plan.investmentStepUp, 0, 100, "Annual step-up");
  pct("licInvestablePct", plan.licInvestablePct, 0, 100, "Investable portion of premium");
  if (isNum(plan.exitTaxRate) && (plan.exitTaxRate < 0 || plan.exitTaxRate > MAX_EXIT_TAX)) {
    add("exitTaxRate", `Exit tax must be between 0% and ${MAX_EXIT_TAX}%.`);
  }

  /* ── Income ── */
  asArray(plan.incomes).forEach((inc, i) => {
    const p = `incomes.${i}`;
    if (!isNum(inc.amount) || inc.amount < 0) add(`${p}.amount`, "Income amount cannot be negative.");
    pct(`${p}.growthRate`, inc.growthRate, -50, 100, "Growth rate");
    if (isNum(inc.retireAge) && isNum(age) && inc.retireAge < age) {
      add(`${p}.retireAge`, `"${inc.name ?? "Income"}" retires before your current age.`, WARN);
    }
    if (inc.frequencyAssumed) {
      add(`${p}.frequency`, `Frequency for "${inc.name ?? "this income"}" was assumed to be monthly. Please confirm.`, WARN);
    }
    /* The v1 -> v2 migration rewrote this amount from gross to take-home. The
       number on screen is not the one they typed, so say so rather than letting
       them find out by noticing their salary looks wrong — or not noticing. */
    if (inc.convertedFromGross) {
      add(`${p}.amount`, `"${inc.name ?? "This income"}" was entered as gross pay. It now shows take-home, after income tax. Please check it against your payslip.`, WARN);
    }
  });

  /* ── Expenses ── */
  for (const k of ["household", "rent"]) {
    const v = plan.expenses?.[k];
    if (!isNum(v) || v < 0) add(`expenses.${k}`, "Expense amount cannot be negative.");
  }

  /* ── Medical insurance ── */
  for (const who of ["self", "parents"]) {
    const m = plan.medical?.[who];
    if (!m) continue;
    const p = `medical.${who}`;
    if (typeof m.enabled !== "boolean") add(`${p}.enabled`, "Choose Yes or No.");
    if (!m.enabled) continue;
    if (!isNum(m.coverage) || m.coverage < 0) add(`${p}.coverage`, "Coverage cannot be negative.");
    if (!isNum(m.premium) || m.premium < 0) add(`${p}.premium`, "Premium cannot be negative.");
    if (m.enabled && m.coverage === 0) {
      add(`${p}.coverage`, "Coverage amount is zero. Enter the sum insured.", WARN);
    }
  }

  /* ── Contributions ── */
  const cs = asObject(plan.contributions);
  for (const k of [...NAMED_CONTRIBUTIONS, "epfEmployer"]) {
    const c = cs[k];
    if (!c) continue;
    if (!isNum(c.amount) || c.amount < 0) add(`contributions.${k}.amount`, "Contribution cannot be negative.");
    pct(`contributions.${k}.annualReturn`, c.annualReturn, -50, 50, "Expected return");
    pct(`contributions.${k}.stepUp`, c.stepUp, 0, 100, "Annual increase");
  }
  const ppfAnnual = cs.ppf ? toAnnual(cs.ppf.amount ?? 0, cs.ppf.frequency ?? "monthly") : 0;
  if (ppfAnnual > PPF_ANNUAL_CAP) {
    add("contributions.ppf.amount",
      `PPF deposits above ₹${PPF_ANNUAL_CAP.toLocaleString("en-IN")} a year earn no interest. Contributions are capped at this limit in the projection.`,
      WARN);
  }

  /* "Other" entries need a name once they carry an amount, otherwise a saved
     profile has an unlabelled sum nobody can account for later. */
  asArray(cs.other).forEach((o, i) => {
    const p = `contributions.other.${i}`;
    if (!isNum(o.amount) || o.amount < 0) add(`${p}.amount`, "Contribution cannot be negative.");
    if ((o.amount ?? 0) > 0 && !String(o.name ?? "").trim()) {
      add(`${p}.name`, "Name this contribution so it can be identified later.");
    }
    if (NAMED_CONTRIBUTIONS.includes(String(o.name ?? "").trim().toLowerCase())) {
      add(`${p}.name`, `"${o.name}" duplicates a category above. It will be counted twice.`, WARN);
    }
  });

  /* ── Holdings ── */
  for (const [k, v] of Object.entries(asObject(plan.holdings))) {
    if (!isNum(v) || v < 0) add(`holdings.${k}`, "Current value cannot be negative.");
  }

  /* ── Life insurance ── */
  const li = plan.lifeInsurance;
  if (li) {
    if (!isNum(li.value) || li.value < 0) add("lifeInsurance.value", "Value cannot be negative.");
    if (!["sumAssured", "surrenderValue"].includes(li.valueType)) {
      add("lifeInsurance.valueType", "Choose whether this is cover or cash value.");
    }
    if (li.surrenderValue !== null && (!isNum(li.surrenderValue) || li.surrenderValue < 0)) {
      add("lifeInsurance.surrenderValue", "Surrender value cannot be negative.");
    }
  }

  /* ── Goals and loans ── */
  asArray(plan.goals).forEach((g, i) => {
    const p = `goals.${i}`;
    if (!isNum(g.amount) || g.amount < 0) add(`${p}.amount`, "Goal cost cannot be negative.");
    if (isNum(g.age) && isNum(plan.lifeExpectancy) && g.age > plan.lifeExpectancy) {
      add(`${p}.age`, `"${g.name ?? "Goal"}" is set after your life expectancy.`, WARN);
    }
    if (!g.hasLoan) return;
    if (!isNum(g.loanTenure) || g.loanTenure < 0) add(`${p}.loanTenure`, "Loan tenure cannot be negative.");
    if (isNum(g.downPaymentPct) && (g.downPaymentPct < 0 || g.downPaymentPct > 100)) {
      add(`${p}.downPaymentPct`, "Down payment must be between 0% and 100%.");
    }
    pct(`${p}.loanRate`, g.loanRate, 0, 50, "Loan rate");
  });

  return out;
}

export const errorsOnly = (findings) => findings.filter((f) => f.severity === ERROR);
export const hasErrors = (findings) => findings.some((f) => f.severity === ERROR);

/* Bring a plan into the range the engine can safely run on. Used only as a
   defence against hand-edited stored JSON; the UI reports rather than silently
   corrects, so the user always sees what was wrong. */
export function clampPlan(plan) {
  const p = structuredClone(plan);
  const clamp = (v, lo, hi, fallback) => (isNum(v) ? Math.min(Math.max(v, lo), hi) : fallback);
  p.exitTaxRate = clamp(p.exitTaxRate, 0, MAX_EXIT_TAX, 0);
  p.lifeExpectancy = clamp(p.lifeExpectancy, 1, MAX_AGE, 85);
  p.currentAge = clamp(p.currentAge, 0, MAX_AGE, 28);
  p.inflationRate = clamp(p.inflationRate, -50, 100, 0);
  p.lifestyleCreep = clamp(p.lifestyleCreep, -50, 100, 0);
  p.licInvestablePct = clamp(p.licInvestablePct, 0, 100, 0);
  for (const k of Object.keys(asObject(p.holdings))) {
    p.holdings[k] = Math.max(0, isNum(p.holdings[k]) ? p.holdings[k] : 0);
  }
  return p;
}

export { ERROR, WARN };
