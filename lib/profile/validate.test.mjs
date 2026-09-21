import { test } from "node:test";
import assert from "node:assert/strict";
import { validate, clampPlan, hasErrors, MAX_EXIT_TAX, WARN } from "./validate.mjs";
import { freshDefaults } from "./schema.mjs";
import { newMember } from "../household/members.mjs";
import { PPF_ANNUAL_CAP } from "../finance/assumptions.mjs";

const plan = (over = {}) => ({ ...freshDefaults(), ...over });
const at = (findings, path) => findings.filter((f) => f.path === path);

test("the default profile is valid", () => {
  assert.deepEqual(validate(freshDefaults()), []);
});

test("a future date of birth is rejected", () => {
  const p = plan();
  p.personal.dob = "2099-01-01";
  assert.equal(at(validate(p), "personal.dob").length, 1);
});

test("an unparseable date of birth is rejected", () => {
  const p = plan();
  p.personal.dob = "not-a-date";
  assert.equal(at(validate(p), "personal.dob").length, 1);
});

test("a valid date of birth passes", () => {
  const p = plan();
  p.personal.dob = "1994-05-20";
  assert.equal(at(validate(p), "personal.dob").length, 0);
});

test("life expectancy at or below current age is rejected", () => {
  assert.ok(at(validate(plan({ currentAge: 40, lifeExpectancy: 40 })), "lifeExpectancy").length);
  assert.ok(at(validate(plan({ currentAge: 40, lifeExpectancy: 30 })), "lifeExpectancy").length);
});

test("a zero-duration horizon is caught before it reaches the engine", () => {
  assert.equal(hasErrors(validate(plan({ currentAge: 50, lifeExpectancy: 50 }))), true);
});

test("an exit tax of 100 is rejected and clamped", () => {
  const p = plan({ exitTaxRate: 100 });
  assert.ok(at(validate(p), "exitTaxRate").length, "100% would divide by zero");
  assert.ok(clampPlan(p).exitTaxRate <= MAX_EXIT_TAX);
});

test("a zero exit tax is fine", () => {
  assert.equal(at(validate(plan({ exitTaxRate: 0 })), "exitTaxRate").length, 0);
});

test("a zero return rate is fine", () => {
  const p = plan({ expectedXIRR: 0, postRetireReturn: 0 });
  assert.equal(at(validate(p), "expectedXIRR").length, 0);
  assert.equal(at(validate(p), "postRetireReturn").length, 0);
});

test("negative money is rejected", () => {
  const p = plan();
  p.expenses.household = -1;
  p.holdings.mf = -5;
  const f = validate(p);
  assert.ok(at(f, "expenses.household").length);
  assert.ok(at(f, "holdings.mf").length);
});

test("zero contributions and zero holdings are allowed", () => {
  const p = plan();
  p.expenses.household = 0;
  p.expenses.rent = 0;
  assert.equal(at(validate(p), "expenses.household").length, 0);
  assert.equal(at(validate(p), "holdings.mf").length, 0);
});

test("an unnamed Other entry with an amount is rejected", () => {
  const p = plan();
  p.contributions.other = [{ id: 1, name: "", amount: 5000, frequency: "monthly", stepUp: 0 }];
  assert.ok(at(validate(p), "contributions.other.0.name").length);
});

test("an unnamed Other entry with no amount is fine", () => {
  const p = plan();
  p.contributions.other = [{ id: 1, name: "", amount: 0, frequency: "monthly", stepUp: 0 }];
  assert.equal(at(validate(p), "contributions.other.0.name").length, 0);
});

test("a PPF contribution above the statutory ceiling warns but does not block", () => {
  const p = plan();
  p.contributions.ppf.amount = PPF_ANNUAL_CAP / 12 + 5000;
  const f = at(validate(p), "contributions.ppf.amount");
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, "warning");
});

test("a PPF contribution exactly at the ceiling does not warn", () => {
  const p = plan();
  p.contributions.ppf.amount = PPF_ANNUAL_CAP / 12;
  assert.equal(at(validate(p), "contributions.ppf.amount").length, 0);
});

test("an insurance answer must be an explicit boolean", () => {
  const p = plan();
  p.medical.self.enabled = undefined;
  assert.ok(at(validate(p), "medical.self.enabled").length);
});

test("insurance amounts are only checked once the answer is Yes", () => {
  const p = plan();
  p.medical.self.enabled = false;
  p.medical.self.premium = 0;
  assert.equal(at(validate(p), "medical.self.premium").length, 0);
});

test("a life insurance value type must be one of the two meanings", () => {
  const p = plan();
  p.lifeInsurance.valueType = "whatever";
  assert.ok(at(validate(p), "lifeInsurance.valueType").length);
});

test("an unknown surrender value stays null without being flagged", () => {
  const p = plan();
  p.lifeInsurance.surrenderValue = null;
  assert.equal(at(validate(p), "lifeInsurance.surrenderValue").length, 0);
});

test("a zero loan tenure is allowed", () => {
  const p = plan();
  p.goals[0].loanTenure = 0;
  assert.equal(at(validate(p), "goals.0.loanTenure").length, 0);
});

test("a down payment above 100 percent is rejected", () => {
  const p = plan();
  p.goals[0].downPaymentPct = 120;
  assert.ok(at(validate(p), "goals.0.downPaymentPct").length);
});

test("an assumed income frequency is surfaced as a warning to confirm", () => {
  const p = plan();
  p.incomes[0].frequencyAssumed = true;
  const f = at(validate(p), "incomes.0.frequency");
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, "warning");
});

test("validate never throws on malformed input", () => {
  for (const bad of [null, undefined, "x", 5, []]) {
    assert.doesNotThrow(() => validate(bad));
  }
  assert.doesNotThrow(() => validate({ incomes: "not an array", holdings: null }));
});

test("clampPlan makes a hand-edited profile safe for the engine", () => {
  const p = plan({ exitTaxRate: 999, currentAge: -5, inflationRate: NaN });
  p.holdings.mf = -100;
  const c = clampPlan(p);
  assert.ok(c.exitTaxRate <= MAX_EXIT_TAX && c.exitTaxRate >= 0);
  assert.ok(c.currentAge >= 0);
  assert.ok(Number.isFinite(c.inflationRate));
  assert.equal(c.holdings.mf, 0);
});

/* ══════════════════════ Household members ══════════════════════ */

const withMember = (over = {}, planOver = {}) => {
  const p = plan(planOver);
  p.members = [{ ...newMember(p, "spouse", 7), ...over }];
  return p;
};

test("a member's income is validated on its own path", () => {
  const p = withMember({
    incomes: [{ id: 1, name: "Her salary", amount: -5, frequency: "monthly", growthRate: 0, retireAge: 60 }],
  });
  assert.equal(at(validate(p), "members.0.incomes.0.amount").length, 1);
});

test("a member's holding cannot be negative", () => {
  const p = withMember();
  p.members[0].holdings.mf = -1;
  assert.equal(at(validate(p), "members.0.holdings.mf").length, 1);
});

test("a member's contributions get the same rules as yours", () => {
  const p = withMember();
  p.members[0].contributions.other = [{ id: 1, name: "", amount: 5000, frequency: "monthly" }];
  assert.equal(at(validate(p), "members.0.contributions.other.0.name").length, 1);
});

/* An excluded member still has a card and a tab, so their findings are always
   somewhere the user can reach — unlike v2's disabled spouse block. */
test("an excluded member is still validated", () => {
  const p = withMember({ included: false });
  p.members[0].holdings.mf = -1;
  assert.equal(at(validate(p), "members.0.holdings.mf").length, 1);
});

test("an assumed age asks to be confirmed, and blocks nothing", () => {
  const p = withMember({ currentAge: null, ageAssumed: true, personal: { fullName: "Priya", dob: null } });
  const f = at(validate(p), "members.0.currentAge");
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, WARN);
  assert.match(f[0].message, /Priya/);
  assert.equal(hasErrors(validate(p)), false);
});

test("cost shares that do not add to 100% are a warning, not an error", () => {
  const p = withMember({ costShare: 30 });
  const f = at(validate(p), "household.costShares");
  assert.equal(f.length, 1);
  assert.equal(f[0].severity, WARN);
  assert.equal(hasErrors(validate(p)), false);

  p.household.selfCostShare = 70;
  assert.equal(at(validate(p), "household.costShares").length, 0);
});

test("no cost-share warning without members", () => {
  assert.equal(at(validate(plan({ household: { includeSelf: true, selfCostShare: 40 } })), "household.costShares").length, 0);
});

test("a member's cost share outside 0-100% is an error", () => {
  assert.equal(at(validate(withMember({ costShare: 140 })), "members.0.costShare").length, 1);
});

test("members' holdings are clamped whether or not they are included", () => {
  const p = withMember({ included: false });
  p.members[0].holdings.mf = -100;
  p.members[0].holdings.fd = Number.NaN;
  const c = clampPlan(p);
  assert.equal(c.members[0].holdings.mf, 0);
  assert.equal(c.members[0].holdings.fd, 0);
});

test("clampPlan survives a profile with no members at all", () => {
  const p = plan();
  delete p.members;
  assert.doesNotThrow(() => clampPlan(p));
});
