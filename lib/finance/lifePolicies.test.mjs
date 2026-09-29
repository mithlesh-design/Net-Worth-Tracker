import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newPolicy, policyYear, policiesYear, maturityAmount, policyEvents, paysMaturity, paysIncome,
} from "./lifePolicies.mjs";

const policy = (over = {}) => ({ ...newPolicy(1, { age: 30, retirementAge: 60 }), ...over });

test("a new policy opens on the retirement age and keeps every field", () => {
  const p = newPolicy(7, { age: 30, retirementAge: 58 });
  assert.equal(p.premiumUntilAge, 58);
  assert.equal(p.maturityAge, 58);
  assert.equal(p.startAge, 30);
  for (const k of ["returnOfPremium", "maturityAmount", "hasIncome", "annualIncome", "incomeStartAge", "incomeEndAge"]) {
    assert.ok(k in p, k);
  }
});

test("the premium is paid up to, not including, the pay-until age", () => {
  const p = policy({ premium: 2000, premiumFrequency: "monthly", premiumUntilAge: 40 });
  assert.equal(policyYear(p, 39).premium, 24000);
  assert.equal(policyYear(p, 40).premium, 0);
});

test("a plain term plan pays nothing out, whatever its sum assured", () => {
  const p = policy({ type: "term", sumAssured: 10000000, premium: 12000, maturityAmount: 999 });
  assert.equal(paysMaturity(p), false);
  for (let a = 30; a <= 85; a++) {
    const y = policyYear(p, a);
    assert.equal(y.income + y.maturity, 0, `age ${a}`);
  }
});

test("return of premium hands back every premium paid, at the maturity age", () => {
  const p = policy({
    type: "term", returnOfPremium: true, premium: 15000, premiumFrequency: "yearly",
    startAge: 28, premiumUntilAge: 58, maturityAge: 60,
  });
  assert.equal(maturityAmount(p), 15000 * 30);
  assert.equal(policyYear(p, 60).maturity, 450000);
  assert.equal(policyYear(p, 59).maturity, 0);
});

test("an endowment pays its maturity amount once", () => {
  const p = policy({ type: "endowment", maturityAge: 50, maturityAmount: 1500000 });
  assert.equal(policyYear(p, 50).maturity, 1500000);
  assert.equal(policyYear(p, 51).maturity, 0);
});

test("annual income runs from start to end age inclusive, then the final maturity", () => {
  const p = policy({
    type: "endowment", hasIncome: true, annualIncome: 100000, incomeStartAge: 45, incomeEndAge: 55,
    maturityAge: 55, maturityAmount: 2000000,
  });
  const paid = [];
  for (let a = 40; a <= 60; a++) if (policyYear(p, a).income) paid.push(a);
  assert.deepEqual(paid, [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]);
  assert.equal(policyYear(p, 55).maturity, 2000000);
});

test("income is ignored unless switched on, and never on a term plan", () => {
  const off = policy({ type: "ulip", hasIncome: false, annualIncome: 50000, incomeStartAge: 30, incomeEndAge: 40 });
  assert.equal(paysIncome(off), false);
  const term = policy({ type: "term", hasIncome: true, annualIncome: 50000 });
  assert.equal(paysIncome(term), false);
});

test("several policies add up", () => {
  const a = policy({ premium: 10000, premiumUntilAge: 40 });
  const b = policy({ type: "endowment", premium: 20000, premiumUntilAge: 40, maturityAge: 35, maturityAmount: 300000 });
  assert.deepEqual(policiesYear([a, b], 35), { premium: 30000, income: 0, maturity: 300000 });
  assert.deepEqual(policiesYear(undefined, 35), { premium: 0, income: 0, maturity: 0 });
});

test("timeline events: maturities and income starts, inside the horizon only", () => {
  const ps = [
    policy({ id: 1, name: "LIC Jeevan", type: "endowment", hasIncome: true, annualIncome: 80000,
      incomeStartAge: 45, incomeEndAge: 55, maturityAge: 55, maturityAmount: 1000000 }),
    policy({ id: 2, type: "ulip", maturityAge: 95, maturityAmount: 500000 }),
    policy({ id: 3, type: "term" }),
  ];
  const ev = policyEvents(ps, { fromAge: 30, toAge: 85 });
  assert.deepEqual(ev.map((e) => [e.kind, e.age, e.amount]), [["income", 45, 80000], ["maturity", 55, 1000000]]);
  assert.equal(ev[0].endAge, 55);
  assert.equal(ev[1].label, "LIC Jeevan");
});

test("household events are placed on your age and name their owner", async () => {
  const { householdPolicyEvents } = await import("./lifePolicies.mjs");
  const { freshDefaults } = await import("../profile/schema.mjs");
  const { newMember } = await import("../household/members.mjs");
  const plan = { ...freshDefaults(), currentAge: 30, lifeExpectancy: 85, personal: { fullName: "", dob: null } };
  plan.lifePolicies = [policy({ id: 1, type: "endowment", maturityAge: 50, maturityAmount: 900000 })];
  const parent = { ...newMember(plan, "parent", 5), currentAge: 60 };
  parent.lifePolicies = [policy({ id: 2, type: "endowment", maturityAge: 70, maturityAmount: 400000 })];
  plan.members = [parent];
  const ev = householdPolicyEvents(plan);
  assert.deepEqual(ev.map((e) => [e.age, e.ownerAge, e.owner, e.amount]),
    [[40, 70, "Parent", 400000], [50, 50, "You", 900000]]);

  parent.included = false;
  assert.equal(householdPolicyEvents(plan).length, 1, "an excluded member's payout is not the household's");
});
