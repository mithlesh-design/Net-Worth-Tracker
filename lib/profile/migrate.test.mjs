import { test } from "node:test";
import assert from "node:assert/strict";
import { migrate } from "./migrate.mjs";
import { DEFAULTS, SCHEMA_VERSION, serialize } from "./schema.mjs";

/* A realistic v0 profile: exactly the 14 keys gatherSettings wrote. */
const v0 = {
  currentAge: 30,
  lifeExpectancy: 85,
  incomes: [
    { id: 1, name: "Primary Salary", amount: 150000, frequency: "monthly", growthRate: 10, retireAge: 55 },
  ],
  monthlyExpense: 60000,
  inflationRate: 6,
  lifestyleCreep: 2,
  currentNW: 5000000,
  monthlyInvestment: 50000,
  investmentStepUp: 10,
  expectedXIRR: 12,
  investSurplus: true,
  postRetireReturn: 7,
  exitTaxRate: 12.5,
  goals: [{ id: 1, name: "Home", emoji: "home", age: 35, amount: 8000000 }],
};

const NAMED_HOLDINGS = ["mf", "fd", "rd", "ppf", "nps", "epf", "stocks", "crypto"];

test("the v0 aggregate net worth lands in unallocated and nowhere else", () => {
  const p = migrate(v0);
  assert.equal(p.holdings.unallocated, 5000000);
  for (const k of NAMED_HOLDINGS) {
    assert.equal(p.holdings[k], 0, `${k} should stay 0 — the breakdown is unknown`);
  }
});

test("the v0 aggregate net worth is not also left on a currentNW key", () => {
  const p = migrate(v0);
  assert.equal(p.currentNW, undefined, "a second copy would be double counted");
});

test("v0 monthlyExpense lands entirely in household, with rent at zero", () => {
  const p = migrate(v0);
  assert.equal(p.expenses.household, 60000);
  assert.equal(p.expenses.rent, 0);
  assert.equal(p.monthlyExpense, undefined);
});

test("rent does not start being skipped on a migrated profile", () => {
  assert.equal(migrate(v0).stopRentOnHomePurchase, false);
});

test("the v0 SIP target is parked in legacy, not in a detailed contribution", () => {
  const p = migrate(v0);
  assert.equal(p.legacy.monthlyInvestment, 50000);
  for (const k of ["mfSip", "nps", "ppf", "epf", "rd", "lic"]) {
    assert.equal(p.contributions[k].amount, 0);
  }
  assert.deepEqual(p.contributions.other, []);
});

test("v0 incomes are marked gross, which is what preserves v0 tax behaviour", () => {
  assert.equal(migrate(v0).incomes[0].basis, "gross");
});

test("an income missing frequency defaults to monthly and is flagged", () => {
  const noFreq = { ...v0, incomes: [{ id: 1, name: "S", amount: 150000, growthRate: 10, retireAge: 55 }] };
  const inc = migrate(noFreq).incomes[0];
  assert.equal(inc.frequency, "monthly", "the yearly fallback would understate by 12x");
  assert.equal(inc.frequencyAssumed, true);
});

test("an income that already has a frequency is not flagged", () => {
  assert.equal(migrate(v0).incomes[0].frequencyAssumed, undefined);
});

test("retirementAge is materialised from the earliest source", () => {
  const two = { ...v0, incomes: [
    { id: 1, amount: 1, frequency: "monthly", growthRate: 0, retireAge: 58 },
    { id: 2, amount: 1, frequency: "monthly", growthRate: 0, retireAge: 52 },
  ]};
  assert.equal(migrate(two).retirementAge, 52);
});

test("a goal missing its loan fields does not produce NaN", () => {
  const g = migrate(v0).goals[0];
  assert.equal(g.hasLoan, false);
  assert.equal(Number.isFinite(g.downPaymentPct), true);
  assert.equal(Number.isFinite(g.loanRate), true);
  assert.equal(Number.isFinite(g.loanTenure), true);
  assert.equal(Number.isFinite(g.appreciationRate), true);
  assert.equal(Number.isFinite(g.maintenancePct), true);
});

test("migrate is idempotent", () => {
  assert.deepEqual(migrate(migrate(v0)), migrate(v0));
  assert.deepEqual(migrate(migrate(migrate(v0))), migrate(v0));
});

test("a confirmed zero survives and is distinct from a missing value", () => {
  const zeroed = migrate({ ...v0, currentNW: 0, monthlyInvestment: 0 });
  assert.equal(zeroed.holdings.unallocated, 0);
  assert.equal(zeroed.legacy.monthlyInvestment, 0);
  // A profile with the key absent gets the default instead.
  const { currentNW, ...noNW } = v0;
  assert.equal(migrate(noNW).holdings.unallocated, DEFAULTS.holdings.unallocated);
});

test("serialize round-trips a migrated plan without loss", () => {
  const p = migrate(v0);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(serialize(p)))), p);
});

test("string numbers from stored JSON are coerced", () => {
  const strings = { ...v0, currentNW: "5000000", monthlyExpense: "60000", currentAge: "30" };
  const p = migrate(strings);
  assert.equal(p.holdings.unallocated, 5000000);
  assert.equal(p.expenses.household, 60000);
  assert.equal(p.currentAge, 30);
});

test("garbage input yields defaults rather than throwing", () => {
  for (const bad of [null, undefined, "nonsense", 42, [], true]) {
    const p = migrate(bad);
    assert.equal(p.schemaVersion, SCHEMA_VERSION);
  }
});

test("a current-version profile passes through untouched", () => {
  const cur = migrate(v0);
  assert.equal(cur.schemaVersion, SCHEMA_VERSION);
  cur.personal.fullName = "Test Person";
  cur.holdings.mf = 250000;
  const again = migrate(cur);
  assert.equal(again.personal.fullName, "Test Person");
  assert.equal(again.holdings.mf, 250000);
  assert.equal(again.holdings.unallocated, 5000000);
});

/* migrate(v0) chains all the way to the current version, so it cannot exercise
   the intermediate hop. Hand-build a v1 document to prove the dispatcher runs
   every step rather than jumping straight to fillDefaults. */
test("a v1 profile chains forward to the current version", () => {
  const v1 = { ...migrate(v0), schemaVersion: 1 };
  const out = migrate(v1);
  assert.equal(out.schemaVersion, SCHEMA_VERSION);
  assert.equal(out.holdings.unallocated, 5000000);
});

/* A rollback is recoverable as long as the data survives; a discarded draft is
   not, because page.jsx writes the draft back unconditionally on mount. */
test("a profile saved by a newer client keeps its data rather than being discarded", () => {
  const future = { ...migrate(v0), schemaVersion: SCHEMA_VERSION + 1 };
  future.holdings.mf = 777777;
  const out = migrate(future);
  assert.equal(out.holdings.mf, 777777);
  assert.equal(out.holdings.unallocated, 5000000);
});

test("a build that bumped the version without adding a step yields defaults", () => {
  const orphaned = { ...migrate(v0), schemaVersion: -1 };
  assert.equal(migrate(orphaned).schemaVersion, SCHEMA_VERSION);
});

test("a profile missing a newly added key gains the default without losing data", () => {
  const cur = migrate(v0);
  cur.holdings.crypto = 99999;
  delete cur.licInvestablePct;
  const filled = migrate(cur);
  assert.equal(filled.licInvestablePct, DEFAULTS.licInvestablePct);
  assert.equal(filled.holdings.crypto, 99999);
});

test("an emptied list stays empty rather than being refilled from defaults", () => {
  const v1 = migrate(v0);
  v1.incomes = [];
  v1.goals = [];
  const again = migrate(v1);
  assert.deepEqual(again.incomes, []);
  assert.deepEqual(again.goals, []);
});

test("every client field has a home in the migrated shape", () => {
  const p = migrate(v0);
  const paths = [
    "personal.fullName", "personal.dob",
    "expenses.household", "expenses.rent",
    "medical.self.enabled", "medical.parents.enabled",
    "contributions.mfSip.amount", "contributions.nps.amount",
    "contributions.ppf.amount", "contributions.epf.amount",
    "contributions.rd.amount", "contributions.lic.amount", "contributions.other",
    "holdings.mf", "holdings.fd", "holdings.rd", "holdings.ppf", "holdings.nps",
    "holdings.epf", "holdings.stocks", "holdings.crypto",
    "lifeInsurance.value", "lifeInsurance.valueType",
  ];
  for (const path of paths) {
    const v = path.split(".").reduce((o, k) => (o == null ? o : o[k]), p);
    assert.notEqual(v, undefined, `${path} is missing`);
  }
});
