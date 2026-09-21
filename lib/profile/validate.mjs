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
import { people, personAge, personLabel, hasMembers } from "../household/members.mjs";

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

  /* One person's rates, contributions and holdings — shared by you and every
     member, so the rules cannot drift apart between them. */
  const checkRates = (who, base) => {
    const at = (k) => (base ? `${base}.${k}` : k);
    pct(at("expectedXIRR"), who.expectedXIRR, -50, 50, "Expected return");
    pct(at("postRetireReturn"), who.postRetireReturn, -50, 50, "Post-retirement return");
    pct(at("investmentStepUp"), who.investmentStepUp, 0, 100, "Annual step-up");
    pct(at("licInvestablePct"), who.licInvestablePct, 0, 100, "Investable portion of premium");
    if (isNum(who.exitTaxRate) && (who.exitTaxRate < 0 || who.exitTaxRate > MAX_EXIT_TAX)) {
      add(at("exitTaxRate"), `Exit tax must be between 0% and ${MAX_EXIT_TAX}%.`);
    }
  };

  function checkContributions(contributions, base) {
    const cs = asObject(contributions);
    for (const k of [...NAMED_CONTRIBUTIONS, "epfEmployer"]) {
      const c = cs[k];
      if (!c) continue;
      if (!isNum(c.amount) || c.amount < 0) add(`${base}.${k}.amount`, "Contribution cannot be negative.");
      pct(`${base}.${k}.annualReturn`, c.annualReturn, -50, 50, "Expected return");
      pct(`${base}.${k}.stepUp`, c.stepUp, 0, 100, "Annual increase");
    }
    const ppfAnnual = cs.ppf ? toAnnual(cs.ppf.amount ?? 0, cs.ppf.frequency ?? "monthly") : 0;
    if (ppfAnnual > PPF_ANNUAL_CAP) {
      add(`${base}.ppf.amount`,
        `PPF deposits above ₹${PPF_ANNUAL_CAP.toLocaleString("en-IN")} a year earn no interest. Contributions are capped at this limit in the projection.`,
        WARN);
    }

    /* "Other" entries need a name once they carry an amount, otherwise a saved
       profile has an unlabelled sum nobody can account for later. */
    asArray(cs.other).forEach((o, i) => {
      const p = `${base}.other.${i}`;
      if (!isNum(o.amount) || o.amount < 0) add(`${p}.amount`, "Contribution cannot be negative.");
      if ((o.amount ?? 0) > 0 && !String(o.name ?? "").trim()) {
        add(`${p}.name`, "Name this contribution so it can be identified later.");
      }
      if (NAMED_CONTRIBUTIONS.includes(String(o.name ?? "").trim().toLowerCase())) {
        add(`${p}.name`, `"${o.name}" duplicates a category above. It will be counted twice.`, WARN);
      }
    });
  }

  function checkHoldings(holdings, base) {
    for (const [k, v] of Object.entries(asObject(holdings))) {
      if (!isNum(v) || v < 0) add(`${base}.${k}`, "Current value cannot be negative.");
    }
  }

  pct("inflationRate", plan.inflationRate, 0, 50, "Inflation");
  pct("lifestyleCreep", plan.lifestyleCreep, 0, 50, "Lifestyle creep");
  checkRates(plan, "");

  /* ── Income ──
     Factored out so every person's list is checked by the same rules. `whose`
     names the person in the one message that mentions an age. */
  const checkIncome = (inc, p, ownerAge, whose) => {
    if (!isNum(inc.amount) || inc.amount < 0) add(`${p}.amount`, "Income amount cannot be negative.");
    pct(`${p}.growthRate`, inc.growthRate, -50, 100, "Growth rate");
    if (isNum(inc.retireAge) && isNum(ownerAge) && inc.retireAge < ownerAge) {
      add(`${p}.retireAge`, `"${inc.name ?? "Income"}" retires before ${whose} current age.`, WARN);
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
  };

  asArray(plan.incomes).forEach((inc, i) => checkIncome(inc, `incomes.${i}`, age, "your"));

  /* ── Household members ──
     Every member is checked whether or not they are included in the household
     total. An excluded member still has a card and a Strategy Hub tab, so a
     finding on them is always somewhere the user can see and fix it — which
     is what keeps saveProfile's hasErrors gate from becoming a dead end. */
  asArray(plan.members).forEach((m, i) => {
    if (!m || typeof m !== "object") return;
    const p = `members.${i}`;
    const who = personLabel(plan, m.id);
    const theirAge = personAge(plan, m.id);

    if (m.currentAge !== null && m.currentAge !== undefined &&
        (!isNum(m.currentAge) || m.currentAge < 0 || m.currentAge > MAX_AGE)) {
      add(`${p}.currentAge`, `Enter an age between 0 and ${MAX_AGE}.`);
    }
    /* Migrated spouses had no age of their own; the migration takes yours. */
    if (m.ageAssumed) {
      add(`${p}.currentAge`, `We assumed ${who} is your age. Please confirm it.`, WARN);
    }
    if (isNum(theirAge) && isNum(plan.lifeExpectancy) && theirAge >= plan.lifeExpectancy) {
      add(`${p}.currentAge`, `${who} is at or past the planning age of ${plan.lifeExpectancy}, so their own projection is empty.`, WARN);
    }
    if (!isNum(m.costShare) || m.costShare < 0 || m.costShare > 100) {
      add(`${p}.costShare`, "Share of household costs must be between 0% and 100%.");
    }

    checkRates(m, p);
    asArray(m.incomes).forEach((inc, j) =>
      checkIncome(inc, `${p}.incomes.${j}`, theirAge, `${who}'s`));
    checkContributions(m.contributions, `${p}.contributions`);
    checkHoldings(m.holdings, `${p}.holdings`);
  });

  /* The household projection charges costs in full whatever the shares say,
     so a total other than 100% only misstates the individual tabs. A warning,
     not an error: the user may be mid-way through re-splitting. */
  if (hasMembers(plan)) {
    const total = people(plan).reduce((s, x) => s + (isNum(x.costShare) ? x.costShare : 0), 0);
    if (Math.abs(total - 100) > 0.5) {
      add("household.costShares",
        `Shares of household costs add up to ${Math.round(total)}%, not 100%. Each person's own tab carries only their share, so ${total < 100 ? "part of the costs appears on nobody's tab" : "some costs appear on more than one tab"}.`,
        WARN);
    }
  }

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

  /* ── Contributions and holdings ── */
  checkContributions(plan.contributions, "contributions");
  checkHoldings(plan.holdings, "holdings");

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
  /* Every member, included or not: an excluded member contributes nothing,
     but a NaN left sitting in their holdings would propagate the moment they
     are switched back on. */
  for (const m of asArray(p.members)) {
    if (!m || typeof m !== "object") continue;
    for (const k of Object.keys(asObject(m.holdings))) {
      m.holdings[k] = Math.max(0, isNum(m.holdings[k]) ? m.holdings[k] : 0);
    }
    m.exitTaxRate = clamp(m.exitTaxRate, 0, MAX_EXIT_TAX, p.exitTaxRate);
    if (m.currentAge !== null && m.currentAge !== undefined) {
      m.currentAge = clamp(m.currentAge, 0, MAX_AGE, null);
    }
    m.costShare = clamp(m.costShare, 0, 100, 0);
  }
  return p;
}

export { ERROR, WARN };
