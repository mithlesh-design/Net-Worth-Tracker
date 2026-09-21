import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SELF, people, includedPeople, personLabel, personPrefix, personAge,
  personPlan, memberPlan, newMember, PERSON_KEYS,
} from "./members.mjs";
import { freshDefaults } from "../profile/schema.mjs";

const base = (over = {}) => ({ ...freshDefaults(), currentAge: 30, ...over });

const member = (plan, over = {}) => ({
  ...newMember(plan, over.relationship ?? "spouse", over.id ?? 101),
  ...over,
});

/* ══════════════════════ people ══════════════════════ */

test("a plan with no household block is just you, included, carrying every cost", () => {
  const p = base();
  delete p.members;
  delete p.household;
  assert.deepEqual(
    people(p).map(({ id, included, costShare }) => ({ id, included, costShare })),
    [{ id: SELF, included: true, costShare: 100 }]);
});

test("members follow you in order, and exclusion is read from each entry", () => {
  const p = base();
  p.members = [member(p, { id: 1 }), member(p, { id: 2, included: false })];
  assert.deepEqual(people(p).map((x) => x.id), [SELF, 1, 2]);
  assert.deepEqual(includedPeople(p).map((x) => x.id), [SELF, 1]);
});

test("you can be excluded from the household", () => {
  const p = base({ household: { includeSelf: false, selfCostShare: 100 } });
  p.members = [member(p, { id: 1 })];
  assert.deepEqual(includedPeople(p).map((x) => x.id), [1]);
});

/* ══════════════════════ labels and paths ══════════════════════ */

test("an unnamed member is labelled by relationship, numbered only when two collide", () => {
  const p = base();
  p.members = [
    member(p, { id: 1, relationship: "spouse" }),
    member(p, { id: 2, relationship: "parent" }),
    member(p, { id: 3, relationship: "parent" }),
    member(p, { id: 4, relationship: "parent", personal: { fullName: "Asha", dob: null } }),
  ];
  assert.equal(personLabel(p, 1), "Spouse");
  assert.equal(personLabel(p, 2), "Parent 1");
  assert.equal(personLabel(p, 3), "Parent 2");
  assert.equal(personLabel(p, 4), "Asha");
  assert.equal(personLabel(p, SELF), "You");
});

test("personPrefix addresses the member by its current index, or refuses", () => {
  const p = base();
  p.members = [member(p, { id: 7 }), member(p, { id: 9 })];
  assert.equal(personPrefix(p, SELF), "");
  assert.equal(personPrefix(p, 9), "members.1.");
  assert.equal(personPrefix(p, 404), null);
});

/* ══════════════════════ age ══════════════════════ */

test("a member with no age of their own is taken to be your age", () => {
  const p = base({ currentAge: 41 });
  p.members = [member(p, { id: 1, currentAge: null })];
  assert.equal(personAge(p, 1), 41);
});

test("a member's own age wins over yours", () => {
  const p = base({ currentAge: 41 });
  p.members = [member(p, { id: 1, currentAge: 66 })];
  assert.equal(personAge(p, 1), 66);
});

/* ══════════════════════ personPlan ══════════════════════ */

test("your personPlan is the plan itself, not a copy", () => {
  const p = base();
  assert.equal(personPlan(p, SELF), p);
});

test("a member's personPlan carries their own money and the household's costs", () => {
  const p = base({ expenses: { household: 70000, rent: 20000 } });
  p.lifeInsurance = { value: 500000, valueType: "surrenderValue", surrenderValue: null };
  p.members = [member(p, {
    id: 1, currentAge: 35, expectedXIRR: 9,
    holdings: { ...p.holdings, fd: 400000 },
  })];
  const pp = personPlan(p, 1);
  assert.equal(pp.holdings.fd, 400000);
  assert.equal(pp.expectedXIRR, 9);
  assert.equal(pp.currentAge, 35);
  assert.deepEqual(pp.expenses, p.expenses, "household costs are carried in full");
  assert.equal(pp.lifeInsurance.value, 0, "your life insurance is not theirs");
  assert.deepEqual(pp.members, []);
});

test("every person key a member carries reaches their personPlan", () => {
  const p = base();
  const m = member(p, { id: 1 });
  p.members = [m];
  const pp = personPlan(p, 1);
  for (const k of PERSON_KEYS) {
    if (k === "personal" || k === "currentAge") continue;
    assert.deepEqual(pp[k], m[k], `${k} was not taken from the member`);
  }
});

/* ══════════════════════ memberPlan ══════════════════════ */

test("with no members and your full share, memberPlan(you) is the plan untouched", () => {
  const p = base();
  assert.equal(memberPlan(p, SELF), p);
});

test("a cost share scales living costs, premiums and goal amounts", () => {
  const p = base({ expenses: { household: 80000, rent: 20000 } });
  p.medical.self = { enabled: true, coverage: 500000, premium: 20000, premiumFrequency: "yearly" };
  p.goals = [{ id: 1, name: "Car", emoji: "car", age: 40, amount: 1000000, hasLoan: false,
               downPaymentPct: 100, loanRate: 9, loanTenure: 5, appreciationRate: 0, maintenancePct: 0 }];
  p.members = [member(p, { id: 1, costShare: 25, currentAge: 30 })];
  const mp = memberPlan(p, 1);
  assert.equal(mp.expenses.household, 20000);
  assert.equal(mp.expenses.rent, 5000);
  assert.equal(mp.medical.self.premium, 5000);
  assert.equal(mp.goals[0].amount, 250000);
});

test("goal ages move onto the member's own age", () => {
  const p = base({ currentAge: 30 });
  p.goals = [{ id: 1, name: "Car", emoji: "car", age: 40, amount: 1000000, hasLoan: false,
               downPaymentPct: 100, loanRate: 9, loanTenure: 5, appreciationRate: 0, maintenancePct: 0 }];
  p.members = [member(p, { id: 1, costShare: 50, currentAge: 34 })];
  assert.equal(memberPlan(p, 1).goals[0].age, 44, "ten years from now is 44 for them");
});

test("your share below 100% scales your own tab too", () => {
  const p = base({ expenses: { household: 60000, rent: 0 }, household: { includeSelf: true, selfCostShare: 50 } });
  assert.equal(memberPlan(p, SELF).expenses.household, 30000);
  assert.equal(p.expenses.household, 60000, "the stored plan is not mutated");
});

test("an individual view is always a single-person plan", () => {
  const p = base({ household: { includeSelf: false, selfCostShare: 100 } });
  p.members = [member(p, { id: 1 })];
  for (const id of [SELF, 1]) {
    const mp = memberPlan(p, id);
    assert.deepEqual(mp.members, []);
    assert.equal(mp.household.includeSelf, true, `${id}: the person being viewed is included`);
  }
});

/* ══════════════════════ newMember ══════════════════════ */

test("a new member starts included, carrying no costs, with your assumptions", () => {
  const p = base({ expectedXIRR: 10.5, exitTaxRate: 15, investSurplus: false });
  const m = newMember(p, "spouse", 5);
  assert.equal(m.included, true);
  assert.equal(m.costShare, 0);
  assert.equal(m.expectedXIRR, 10.5);
  assert.equal(m.exitTaxRate, 15);
  assert.equal(m.investSurplus, false);
  assert.deepEqual(m.incomes, []);
  assert.equal(Object.values(m.holdings).reduce((s, v) => s + v, 0), 0);
});

test("a new member's inherited overrides are a copy, not a shared reference", () => {
  const p = base({ bucketOverrides: { mf: { annualReturn: 11 } } });
  const m = newMember(p, "spouse", 5);
  m.bucketOverrides.mf.annualReturn = 3;
  assert.equal(p.bucketOverrides.mf.annualReturn, 11);
});

test("an unknown relationship is stored as 'other'", () => {
  assert.equal(newMember(base(), "cousin", 1).relationship, "other");
});
