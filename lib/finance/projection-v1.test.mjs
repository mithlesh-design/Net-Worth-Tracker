import { test } from "node:test";
import assert from "node:assert/strict";
import { runProjectionV1, blendedReturn } from "./projection.mjs";
import { drawFromBuckets } from "./drawdown.mjs";
import { freshDefaults } from "../profile/schema.mjs";
import { BUCKET_NAMES } from "../profile/schema.mjs";
import { SELF, newMember, memberPlan } from "../household/members.mjs";

/* A plan built from defaults with targeted overrides. Most tests silence the
   things they are not measuring (goals, growth, inflation) so a failure points
   at one mechanism. */
function plan(over = {}) {
  const p = freshDefaults();
  const merge = (base, o) => {
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
        merge(base[k], v);
      } else base[k] = v;
    }
  };
  merge(p, over);
  return p;
}

const income = (over = {}) => ({
  id: 1, name: "Salary", role: "salary", amount: 100000, frequency: "monthly",
  growthRate: 0, retireAge: 60, ...over,
});

const contrib = (over = {}) => ({
  amount: 0, frequency: "monthly", annualReturn: null, stepUp: 0,
  fundedFromPayroll: false, ...over,
});

/* Zero every instrument return, so an arithmetic identity is testable. Setting
   expectedXIRR alone is not enough: PPF, EPF, NPS, FD/RD and LIC carry their
   own non-null defaults. */
const zeroReturns = () =>
  Object.fromEntries(BUCKET_NAMES.map((b) => [b, { annualReturn: 0 }]));

/* ══════════════════════ Income ══════════════════════ */

/* v1 split incomes into gross and take-home pools and ran the slabs over the
   gross one. v2 has no tax model: every amount is what reaches the bank, so
   the engine must sum sources and charge nothing against them. Two sources
   that each fell under the rebate are the case that used to differ. */
test("income is never taxed, however the sources are split", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40, retirementAge: 60,
    incomes: [
      income({ id: 1, amount: 1200000, frequency: "yearly" }),
      income({ id: 2, amount: 1200000, frequency: "yearly", role: "other" }),
    ],
  });
  const row = runProjectionV1(p).data[1];
  assert.equal(row.income, 2400000);
  assert.equal(row.incomeTax, undefined, "incomeTax should no longer be a row field");
  assert.equal(row.postTaxIncome, undefined, "postTaxIncome should no longer be a row field");
});

test("a retired source stops contributing to income", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40, retirementAge: 60,
    incomes: [
      income({ id: 1, amount: 1200000, frequency: "yearly", retireAge: 32 }),
      income({ id: 2, amount: 600000, frequency: "yearly", role: "other", retireAge: 60 }),
    ],
  });
  const rows = runProjectionV1(p).data;
  assert.equal(rows.find((r) => r.age === 31).income, 1800000);
  assert.equal(rows.find((r) => r.age === 32).income, 600000);
});

/* ══════════════════════ Contributions ══════════════════════ */

test("payroll-funded EPF still lands in the bucket during a deficit year", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 20000 })],
    expenses: { household: 100000, rent: 0 },
    contributions: { epf: contrib({ amount: 5000, fundedFromPayroll: true }) },
  });
  const row = runProjectionV1(p).data[1];
  assert.ok(row.buckets.epf > 0, "EPF was skipped because cash was short");
  assert.equal(row.deficit, true);
});

test("a payroll contribution is not subtracted from take-home cash again", () => {
  const base = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 100000 })],
    expenses: { household: 30000, rent: 0 },
  });
  const withEpf = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 100000 })],
    expenses: { household: 30000, rent: 0 },
    contributions: { epf: contrib({ amount: 10000, fundedFromPayroll: true }) },
  });
  assert.equal(runProjectionV1(base).data[1].availableCash,
               runProjectionV1(withEpf).data[1].availableCash,
               "payroll money was deducted from cash that never held it");
});

test("the aggregate SIP target is ignored once any detailed contribution exists", () => {
  /* investmentStepUp must be 0 for the two plans to differ in exactly one way.
     The aggregate path inherits plan.investmentStepUp while contrib() pins
     stepUp: 0, so at the default 10% the detailed plan falls 35% behind over
     twenty years for a reason that has nothing to do with summing. Until v2
     this was hidden: income tax constrained both plans to the same cash
     ceiling, so the step-up never got to compound and the test passed on a
     coincidence. */
  const shared = { currentAge: 30, lifeExpectancy: 50, investSurplus: false,
                   investmentStepUp: 0,
                   incomes: [income({ amount: 200000 })] };
  const aggregate = plan({ ...shared, legacy: { monthlyInvestment: 50000 } });
  const detailed = plan({
    ...shared,
    legacy: { monthlyInvestment: 50000 },
    contributions: { mfSip: contrib({ amount: 50000 }) },
  });
  const a = runProjectionV1(aggregate).data.at(-1).netWorthRaw;
  const b = runProjectionV1(detailed).data.at(-1).netWorthRaw;
  assert.ok(Math.abs(a - b) / Math.max(a, b) < 0.02,
    `aggregate ${a} vs detailed ${b} — they appear to have been summed`);
});

test("surplus is only what remains after contributions", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35, investSurplus: true,
    incomes: [income({ amount: 200000 })],
    expenses: { household: 50000, rent: 0 },
    contributions: { mfSip: contrib({ amount: 10000 }) },
  });
  const row = runProjectionV1(p).data[1];
  // Everything available is invested exactly once: contributions plus leftover.
  assert.equal(Math.round(row.invested), Math.round(Math.max(0, row.availableCash)));
});

test("a contribution that cannot be funded is reported, not silently assumed", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35, investSurplus: false,
    incomes: [income({ amount: 40000 })],
    expenses: { household: 35000, rent: 0 },
    contributions: { mfSip: contrib({ amount: 30000 }) },
  });
  const row = runProjectionV1(p).data[1];
  assert.ok(row.contributionShortfall > 0);
  assert.equal(row.constrained, true);
  assert.ok(row.actualContribution < row.plannedContribution);
});

test("PPF contributions are capped at the statutory annual ceiling", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 500000 })],
    expenses: { household: 0, rent: 0 },
    bucketOverrides: zeroReturns(),
    contributions: { ppf: contrib({ amount: 50000 }) }, // 6L/yr, well over the cap
  });
  const row = runProjectionV1(p).data[1];
  assert.ok(row.buckets.ppf <= 150000 * 2 + 1, `PPF grew to ${row.buckets.ppf}`);
});

/* ══════════════════════ Holdings and opening balance ══════════════════════ */

test("the opening portfolio is the sum of holdings, counted once", () => {
  const p = plan({ holdings: { mf: 2000000, unallocated: 5000000 } });
  assert.equal(runProjectionV1(p).openingPortfolio, 7000000);
});

test("FD and RD combine into the single FD/RD figure the intake sheet asks for", () => {
  const p = plan({ holdings: { fd: 300000, rd: 200000 } });
  assert.equal(runProjectionV1(p).openingPortfolio, 500000);
  assert.equal(runProjectionV1(p).data[0].buckets.fdrd, 500000);
});

test("a life insurance sum assured never enters net worth", () => {
  const cover = plan({ lifeInsurance: { value: 10000000, valueType: "sumAssured", surrenderValue: null } });
  assert.equal(runProjectionV1(cover).openingPortfolio, 0);
});

test("a life insurance surrender value does enter net worth", () => {
  const cash = plan({ lifeInsurance: { value: 10000000, valueType: "surrenderValue", surrenderValue: null } });
  assert.equal(runProjectionV1(cash).openingPortfolio, 10000000);
});

test("a known cash value alongside a sum assured counts only the cash value", () => {
  const both = plan({ lifeInsurance: { value: 10000000, valueType: "sumAssured", surrenderValue: 250000 } });
  assert.equal(runProjectionV1(both).openingPortfolio, 250000);
});

test("medical coverage is never treated as an asset", () => {
  const p = plan({ medical: { self: { enabled: true, coverage: 5000000, premium: 0, premiumFrequency: "yearly" } } });
  assert.equal(runProjectionV1(p).openingPortfolio, 0);
});

/* ══════════════════════ Insurance premiums ══════════════════════ */

test("a shared family policy premium is counted once, not twice", () => {
  const shared = { currentAge: 30, lifeExpectancy: 35,
                   incomes: [income()] };
  const separate = plan({ ...shared, medical: {
    self: { enabled: true, coverage: 1000000, premium: 24000, premiumFrequency: "yearly" },
    parents: { enabled: true, coverage: 1000000, premium: 40000, premiumFrequency: "yearly", premiumMode: "separate" },
  }});
  const included = plan({ ...shared, medical: {
    self: { enabled: true, coverage: 1000000, premium: 24000, premiumFrequency: "yearly" },
    parents: { enabled: true, coverage: 1000000, premium: 40000, premiumFrequency: "yearly", premiumMode: "includedInSelfPolicy" },
  }});
  assert.equal(runProjectionV1(separate).data[1].insurancePremium, 64000);
  assert.equal(runProjectionV1(included).data[1].insurancePremium, 24000);
});

test("a yearly premium is not multiplied as if it were monthly", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income()],
    medical: { self: { enabled: true, coverage: 500000, premium: 24000, premiumFrequency: "yearly" } },
  });
  assert.equal(runProjectionV1(p).data[1].insurancePremium, 24000);
});

test("a disabled policy charges nothing even with a premium recorded", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income()],
    medical: { self: { enabled: false, coverage: 500000, premium: 24000, premiumFrequency: "yearly" } },
  });
  assert.equal(runProjectionV1(p).data[1].insurancePremium, 0);
});

/* ══════════════════════ LIC ══════════════════════ */

test("a LIC premium is an outflow, not an asset, by default", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 200000 })],
    expenses: { household: 0, rent: 0 },
    investSurplus: false,
    licInvestablePct: 0,
    contributions: { lic: contrib({ amount: 10000 }) },
  });
  const row = runProjectionV1(p).data[1];
  assert.equal(row.buckets.lic, 0, "the whole premium was treated as savings");
  assert.ok(row.actualContribution > 0, "but it still leaves the bank account");
});

test("an endowment policy can be declared partly investable", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 200000 })],
    expenses: { household: 0, rent: 0 },
    investSurplus: false,
    licInvestablePct: 60,
    bucketOverrides: zeroReturns(),
    contributions: { lic: contrib({ amount: 10000 }) },
  });
  // ₹10,000/mo = ₹1,20,000/yr, of which 60% is investable = ₹72,000 a year.
  // Row 1 is the second year, so two years' worth have accrued.
  assert.equal(Math.round(runProjectionV1(p).data[1].buckets.lic), 144000);
  assert.equal(Math.round(runProjectionV1(p).data[0].buckets.lic), 72000);
});

/* ══════════════════════ Locked vs liquid ══════════════════════ */

test("locked holdings cannot fund a goal before they unlock", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40, retirementAge: 60,
    incomes: [income({ amount: 0 })],
    expenses: { household: 0, rent: 0 },
    holdings: { ppf: 5000000, nps: 5000000 },
    ppfOpenedYear: new Date().getFullYear(),
    goals: [{ id: 1, name: "Car", emoji: "car", age: 32, amount: 1000000,
              hasLoan: false, downPaymentPct: 100, loanRate: 0, loanTenure: 0,
              appreciationRate: 0, maintenancePct: 0 }],
  });
  const out = runProjectionV1(p);
  const row = out.data.find((r) => r.age === 32);
  assert.ok(row.unfundedThisYear > 0, "a locked holding was spent at 32");
});

test("liquid and locked are reported separately", () => {
  // No income and no contributions, so year 0 reflects the holdings alone.
  const p = plan({
    currentAge: 30, lifeExpectancy: 35, investSurplus: false,
    incomes: [], expenses: { household: 0, rent: 0 }, goals: [],
    holdings: { mf: 1000000, ppf: 500000 },
  });
  const row = runProjectionV1(p).data[0];
  assert.equal(row.liquidNW, 1000000);
  assert.equal(row.lockedNW, 500000);
  assert.equal(row.netWorthRaw, 1500000);
  assert.equal(runProjectionV1(p).openingPortfolio, 1500000);
});

/* ══════════════════════ Solvency ══════════════════════ */

test("a shortfall accumulates linearly instead of compounding at the return rate", () => {
  const p = plan({
    currentAge: 29, lifeExpectancy: 60, retirementAge: 30,
    inflationRate: 0, lifestyleCreep: 0,
    incomes: [income({ retireAge: 30 })],
    holdings: { mf: 100000 },
    expenses: { household: 200000, rent: 0 },
    goals: [],
  });
  const out = runProjectionV1(p);

  // Every bucket stays solvent; the gap is carried as an explicit figure.
  for (const row of out.data) {
    for (const [b, v] of Object.entries(row.buckets)) {
      assert.ok(v >= 0, `${b} went negative at age ${row.age}`);
    }
  }
  assert.ok(out.depletionAge !== null, "depletion was not reported");
  assert.ok(out.data.at(-1).cumUnfunded > 0);

  // The v0 engine multiplied an already-negative balance by (1 + return), so
  // the deficit grew geometrically. Here the yearly gap is bounded by the
  // annual spend, so the running total grows at a steady rate.
  const spendPerYear = 200000 * 12;
  for (const row of out.data) {
    assert.ok(row.unfundedThisYear <= spendPerYear + 1,
      `age ${row.age} lost ${row.unfundedThisYear}, more than a year of spending`);
  }
  // The first shortfall year is partly covered by the remaining balance, so
  // compare the steady-state years after the portfolio is exhausted.
  const gaps = out.data.filter((r) => r.unfundedThisYear > 0).map((r) => r.unfundedThisYear).slice(1);
  assert.ok(Math.max(...gaps) - Math.min(...gaps) < 1,
    `the yearly shortfall is growing (${Math.min(...gaps)} to ${Math.max(...gaps)}), which means it is compounding`);

  // The total gap is the flat annual spend times the number of years short.
  // Under v0's geometric compounding this would be an order of magnitude worse.
  assert.ok(out.data.at(-1).cumUnfunded < spendPerYear * out.data.length,
    "the accumulated shortfall exceeds the total amount ever spent");
});

test("every bucket stays non-negative in a ruinous plan", () => {
  const p = plan({
    currentAge: 29, lifeExpectancy: 70, retirementAge: 30,
    incomes: [income({ retireAge: 30 })],
    holdings: { mf: 50000, ppf: 50000 },
    expenses: { household: 300000, rent: 0 },
  });
  for (const row of runProjectionV1(p).data) {
    for (const [b, v] of Object.entries(row.buckets)) {
      assert.ok(v >= 0, `${b} went negative at age ${row.age}`);
    }
  }
});

/* ══════════════════════ Arithmetic identities ══════════════════════ */

test("zero returns everywhere: final equals opening plus contributions", () => {
  // Retirement sits past the horizon, so every year is a working year with
  // income covering expenses. Nothing is drawn down and nothing compounds.
  const p = plan({
    currentAge: 30, lifeExpectancy: 40, retirementAge: 99,
    expectedXIRR: 0, postRetireReturn: 0, inflationRate: 0, lifestyleCreep: 0, investSurplus: false, investmentStepUp: 0,
    bucketOverrides: zeroReturns(),
    incomes: [income({ amount: 100000, retireAge: 99 })],
    expenses: { household: 10000, rent: 0 },
    holdings: { mf: 1000000 },
    contributions: { mfSip: contrib({ amount: 10000 }) },
    goals: [],
  });
  const out = runProjectionV1(p);
  // Rows are ages 30..40 inclusive, so 11 contributions of ₹1,20,000.
  assert.equal(out.data.length, 11);
  assert.equal(out.data.at(-1).netWorthRaw, 1000000 + 120000 * 11);
  assert.equal(out.data.at(-1).cumUnfunded, 0);
});

test("a retired year with no income draws the shortfall, grossed up for exit tax", () => {
  const p = plan({
    currentAge: 39, lifeExpectancy: 40, retirementAge: 40,
    expectedXIRR: 0, postRetireReturn: 0, inflationRate: 0, lifestyleCreep: 0, investSurplus: false, investmentStepUp: 0,
    exitTaxRate: 12.5,
    bucketOverrides: zeroReturns(),
    incomes: [income({ amount: 100000, retireAge: 40 })],
    expenses: { household: 10000, rent: 0 },
    holdings: { mf: 1000000 },
    contributions: {}, legacy: { monthlyInvestment: 0 },
    goals: [],
  });
  const out = runProjectionV1(p);
  const retired = out.data.at(-1);
  assert.equal(retired.isRetired, true);
  // ₹1,20,000 of spending needs ₹1,37,142.86 gross at 12.5%.
  assert.equal(retired.netWorthRaw, Math.round(1000000 - 120000 / 0.875));
});

test("zero contributions and zero holdings stay at zero without NaN", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40, retirementAge: 40,
    incomes: [income({ amount: 0 })],
    expenses: { household: 0, rent: 0 },
    holdings: {}, goals: [], investSurplus: false,
  });
  const out = runProjectionV1(p);
  assert.equal(out.openingPortfolio, 0);
  for (const row of out.data) assert.ok(Number.isFinite(row.netWorthRaw));
});

/* ══════════════════════ Edge cases ══════════════════════ */

test("a zero-length horizon still returns the opening snapshot", () => {
  const p = plan({ currentAge: 50, lifeExpectancy: 50, holdings: { mf: 100000 } });
  const out = runProjectionV1(p);
  assert.equal(out.data.length, 1);
  assert.equal(out.data[0].age, 50);
});

test("an inverted horizon returns no rows rather than throwing", () => {
  const p = plan({ currentAge: 60, lifeExpectancy: 40 });
  assert.doesNotThrow(() => runProjectionV1(p));
  assert.deepEqual(runProjectionV1(p).data, []);
});

test("date of birth drives the horizon when present", () => {
  const dob = `${new Date().getFullYear() - 40}-01-01`;
  const p = plan({ currentAge: 28, lifeExpectancy: 80, personal: { fullName: "", dob } });
  assert.equal(runProjectionV1(p).data[0].age, 40, "currentAge should not win over dob");
});

test("an empty income list does not make the plan retired from year zero", () => {
  const p = plan({ currentAge: 30, lifeExpectancy: 40, retirementAge: 60, incomes: [] });
  assert.equal(runProjectionV1(p).data[1].isRetired, false,
    "[].every() is true, which used to flip isRetired immediately");
});

test("a late-retiring second income does not block the retirement switch", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 70, retirementAge: 55,
    incomes: [income({ id: 1, retireAge: 55 }), income({ id: 2, role: "other", retireAge: 90 })],
  });
  const row = runProjectionV1(p).data.find((r) => r.age === 60);
  assert.equal(row.isRetired, true, "isRetired must follow retirementAge, not every() source");
});

test("an exit tax of 100 is clamped rather than producing Infinity", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40, exitTaxRate: 100,
    holdings: { mf: 5000000 },
    goals: [{ id: 1, name: "X", emoji: "other", age: 32, amount: 100000,
              hasLoan: false, downPaymentPct: 100, loanRate: 0, loanTenure: 0,
              appreciationRate: 0, maintenancePct: 0 }],
  });
  for (const row of runProjectionV1(p).data) {
    assert.ok(Number.isFinite(row.netWorthRaw), `age ${row.age} is ${row.netWorthRaw}`);
  }
});

test("a zero-tenure loan does not throw", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40,
    goals: [{ id: 1, name: "X", emoji: "car", age: 32, amount: 500000,
              hasLoan: true, downPaymentPct: 20, loanRate: 9, loanTenure: 0,
              appreciationRate: 0, maintenancePct: 0 }],
  });
  assert.doesNotThrow(() => runProjectionV1(p));
});

test("no recorded field is ever NaN", () => {
  const p = plan({ currentAge: 28, lifeExpectancy: 100 });
  for (const row of runProjectionV1(p).data) {
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "number") {
        assert.ok(Number.isFinite(v), `${k} is ${v} at age ${row.age}`);
      }
    }
  }
});

test("the row shape keeps every field the existing tooltip and tiles read", () => {
  const row = runProjectionV1(plan()).data[1];
  const v0Fields = [
    "age", "year", "netWorth", "netWorthRaw", "liquidNW", "totalPropertyValue",
    "totalLoanOutstanding", "income",
    "annualExpense", "totalEMI", "maintenanceCost", "availableCash",
    "targetInvestment", "invested", "surplusSpent", "goalCost", "goalCostGross",
    "deficit", "constrained", "isRetired", "returnRate",
  ];
  for (const f of v0Fields) assert.ok(f in row, `${f} is missing from the row`);

  /* Dropped with the tax model. Pinned so they cannot drift back in as
     permanently-zero fields that readers would take for a real distinction. */
  for (const f of ["grossIncome", "incomeTax", "postTaxIncome"]) {
    assert.ok(!(f in row), `${f} should have been dropped from the row`);
  }
});

/* ══════════════════════ Household members ══════════════════════ */

const ZERO_HOLDINGS = { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0, unallocated: 0 };

/* A plan with nothing moving except what a test adds: no goals, no costs, no
   growth unless asked for. */
const quiet = (over = {}) => plan({
  currentAge: 30, lifeExpectancy: 45, retirementAge: 60,
  incomes: [], goals: [], expenses: { household: 0, rent: 0 },
  inflationRate: 0, lifestyleCreep: 0, bucketOverrides: zeroReturns(),
  ...over,
});

/* A member built the way the app builds one, then overridden. */
const person = (p, over = {}) => ({
  ...newMember(p, over.relationship ?? "spouse", over.id ?? 7),
  holdings: { ...ZERO_HOLDINGS },
  ...over,
});

const withMembers = (p, ...ms) => ({ ...p, members: ms });

/* Recording someone is not the same as counting them. */
test("an excluded member changes nothing at all", () => {
  const base = quiet({ incomes: [income({ amount: 100000 })], expenses: { household: 40000, rent: 0 } });
  const excluded = withMembers(base, person(base, {
    included: false,
    incomes: [income({ id: 9, amount: 80000 })],
    holdings: { ...ZERO_HOLDINGS, mf: 500000 },
  }));
  assert.deepEqual(runProjectionV1(excluded), runProjectionV1(base));
});

test("including a member adds exactly their income to the row", () => {
  const base = quiet({ incomes: [income({ amount: 100000 })] });
  const both = withMembers(base, person(base, { incomes: [income({ id: 9, amount: 80000 })] }));
  const a = runProjectionV1(base).data[1].income;
  const b = runProjectionV1(both).data[1].income;
  assert.equal(b - a, 80000 * 12);
});

test("including a member adds their holdings to the opening portfolio, instrument by instrument", () => {
  const base = quiet({ holdings: { ...ZERO_HOLDINGS, mf: 100000 } });
  const both = withMembers(base, person(base, {
    holdings: { ...ZERO_HOLDINGS, mf: 300000, fd: 100000, rd: 50000 },
  }));
  const out = runProjectionV1(both);
  assert.equal(out.openingPortfolio - runProjectionV1(base).openingPortfolio, 450000);
  /* FD and RD land in the one fdrd bucket; rows are summed by instrument, so
     their shape does not change with the number of people. */
  assert.equal(out.data[0].buckets.fdrd, 150000);
  assert.equal(out.data[0].buckets.mf, 400000);
  assert.deepEqual(Object.keys(out.data[0].buckets), Object.keys(runProjectionV1(base).data[0].buckets));
});

/* The ledgers are an accounting split, not a change in what the money does:
   the same rupees, at the same rates, in two pockets instead of one. */
test("splitting one person's money across two identical people keeps household net worth", () => {
  const common = {
    currentAge: 30, lifeExpectancy: 70, retirementAge: 55,
    expenses: { household: 60000, rent: 0 }, inflationRate: 6, lifestyleCreep: 1,
    bucketOverrides: {}, expectedXIRR: 11,
    goals: [{ id: 1, name: "Car", emoji: "car", age: 40, amount: 2000000, hasLoan: false,
              downPaymentPct: 100, loanRate: 9, loanTenure: 5, appreciationRate: 0, maintenancePct: 0 }],
  };
  const one = plan({ ...common,
    incomes: [income({ amount: 150000, retireAge: 55 })],
    holdings: { ...ZERO_HOLDINGS, mf: 2000000, epf: 800000, fd: 400000 },
  });
  const halves = plan({ ...common,
    incomes: [income({ amount: 150000, retireAge: 55 })],
    holdings: { ...ZERO_HOLDINGS, mf: 1000000, epf: 400000, fd: 200000 },
  });
  const twin = withMembers(halves, person(halves, {
    currentAge: null, retirementAge: 55,
    holdings: { ...ZERO_HOLDINGS, mf: 1000000, epf: 400000, fd: 200000 },
  }));
  const a = runProjectionV1(one).data;
  const b = runProjectionV1(twin).data;
  a.forEach((row, i) => assert.ok(Math.abs(row.netWorthRaw - b[i].netWorthRaw) <= 1,
    `age ${row.age}: ${row.netWorthRaw} vs ${b[i].netWorthRaw}`));
});

test("a member's own return applies only to their own buckets", () => {
  const base = quiet({ holdings: { ...ZERO_HOLDINGS, mf: 100000 } });
  const both = withMembers(base, person(base, {
    bucketOverrides: {}, expectedXIRR: 10,
    holdings: { ...ZERO_HOLDINGS, mf: 100000 },
  }));
  /* Yours is held flat by zeroReturns(); theirs inherits their own 10%. */
  assert.equal(runProjectionV1(both).data[1].buckets.mf, 100000 + 110000);
});

test("a member's income stops at their own retireAge, read on their own age", () => {
  const base = quiet({ incomes: [income({ amount: 100000, retireAge: 60 })] });
  const both = withMembers(base, person(base, {
    currentAge: 40, incomes: [income({ id: 9, amount: 80000, retireAge: 45 })],
  }));
  const rows = runProjectionV1(both).data;
  /* They turn 45 when you turn 35. */
  assert.equal(rows.find((r) => r.age === 34).income, (100000 + 80000) * 12);
  assert.equal(rows.find((r) => r.age === 35).income, 100000 * 12);
});

test("a member's retirement stops their contributions only, and the household works on", () => {
  const base = quiet({ incomes: [income({ amount: 200000 })], retirementAge: 60 });
  const c = freshDefaults().contributions;
  c.mfSip = contrib({ amount: 10000 });
  const both = withMembers(base, person(base, {
    currentAge: null, retirementAge: 32, contributions: c, investmentStepUp: 0,
  }));
  const rows = runProjectionV1(both).data;
  assert.equal(rows.find((r) => r.age === 31).targetInvestment, 120000);
  assert.equal(rows.find((r) => r.age === 32).targetInvestment, 0);
  assert.equal(rows.find((r) => r.age === 32).isRetired, false, "you are still working");
});

test("the household is retired only once everyone included has stopped working", () => {
  const base = quiet({ retirementAge: 35 });
  const both = withMembers(base, person(base, { currentAge: null, retirementAge: 38 }));
  const rows = runProjectionV1(both).data;
  assert.equal(rows.find((r) => r.age === 37).isRetired, false);
  assert.equal(rows.find((r) => r.age === 38).isRetired, true);
});

/* Locked money opens on its OWNER's birthday. Reading it on yours would let a
   30-year-old's plan spend a 56-year-old parent's EPF 26 years late — or a
   parent's plan spend yours decades early. */
test("a parent's EPF unlocks at their 58, not yours", () => {
  const base = quiet({ expenses: { household: 10000, rent: 0 } });
  const both = withMembers(base, person(base, {
    relationship: "parent", currentAge: 56, retirementAge: 56,
    holdings: { ...ZERO_HOLDINGS, epf: 1000000 },
  }));
  const rows = runProjectionV1(both).data;
  assert.equal(rows.find((r) => r.age === 31).buckets.epf, 1000000, "still locked at their 57");
  assert.ok(rows.find((r) => r.age === 31).cumUnfunded > 0, "with nothing liquid, costs go unfunded");
  assert.ok(rows.find((r) => r.age === 32).buckets.epf < 1000000, "open at their 58");
});

/* Switching someone off removes their money, never the household's bills. */
test("switching you off keeps the household's costs in full", () => {
  const base = quiet({
    incomes: [income({ amount: 100000 })],
    expenses: { household: 50000, rent: 10000 },
  });
  const m = person(base, { incomes: [income({ id: 9, amount: 70000 })] });
  const all = runProjectionV1(withMembers(base, m)).data[0];
  const withoutYou = runProjectionV1({
    ...withMembers(base, m), household: { includeSelf: false, selfCostShare: 100 },
  }).data[0];
  assert.equal(withoutYou.annualExpense, all.annualExpense);
  assert.equal(withoutYou.income, 70000 * 12);
});

test("leftover cash follows each earner's own invest-surplus setting, split by what they bring in", () => {
  const base = quiet({ incomes: [income({ amount: 100000 })], investSurplus: true });
  const both = withMembers(base, person(base, {
    investSurplus: false, incomes: [income({ id: 9, amount: 100000 })],
  }));
  const row = runProjectionV1(both).data[0];
  /* Equal earners, no costs: half the leftover is yours and invested, half is
     theirs and — by their own setting — spent. */
  assert.equal(row.surplusSpent, 100000 * 12);
  assert.equal(row.invested, 100000 * 12);
});

test("a household with nobody included funds nothing", () => {
  const base = quiet({
    expenses: { household: 10000, rent: 0 }, holdings: { ...ZERO_HOLDINGS, mf: 1000000 },
    household: { includeSelf: false, selfCostShare: 100 },
  });
  const out = runProjectionV1(base);
  assert.equal(out.openingPortfolio, 0);
  assert.ok(out.data[0].cumUnfunded > 0);
});

/* ══════════════════════ Individual views ══════════════════════ */

test("your own tab with no members is exactly the household projection", () => {
  const p = plan();
  assert.deepEqual(runProjectionV1(memberPlan(p, SELF)), runProjectionV1(p));
});

test("a member's own tab carries only their share of the household's costs", () => {
  const base = quiet({ expenses: { household: 80000, rent: 0 } });
  const m = person(base, { costShare: 25, incomes: [income({ id: 9, amount: 90000 })] });
  const p = withMembers(base, m);
  const theirs = runProjectionV1(memberPlan(p, m.id)).data[0];
  assert.equal(theirs.annualExpense, 20000 * 12);
  assert.equal(theirs.income, 90000 * 12);
});

/* ══════════════════════ The illiquid tier ══════════════════════ */

/* These three pin decisions that are easy to "tidy up" into bugs later. */

test("an illiquid bucket is never sold, however large the shortfall", () => {
  /* Tested against drawFromBuckets directly: it is the only code that can sell
     anything, and it builds its tier list from LIQUID and unlocked LOCKED only.
     A property balance is therefore unreachable by construction rather than by
     convention — assert that, with far more need than liquid money to meet it. */
  const B = { mf: 100000, stocks: 0, crypto: 0, fdrd: 0, ppf: 0, epf: 0, nps: 0,
              lic: 0, unallocated: 0, property: 50000000 };
  const res = drawFromBuckets(B, 5000000, 70, { exitTax: {}, unlockAge: {} });
  assert.equal(B.property, 50000000, "the house was sold to cover a shortfall");
  assert.equal(B.mf, 0, "liquid money should have drained first");
  assert.ok(res.unfunded > 0, "the rest of the need must be reported unfunded");
});

test("net worth counts illiquid holdings but financial independence does not", () => {
  /* Same plan twice; the only difference is a property balance injected via a
     bucket override, so any change is attributable to the tier alone. */
  const base = plan({
    currentAge: 40, lifeExpectancy: 85, retirementAge: 60,
    incomes: [income({ amount: 100000 })],
    expenses: { household: 40000, rent: 0 },
  });
  const a = runProjectionV1(base);
  assert.equal(a.data[0].illiquidNW, 0);
  /* FI must depend only on liquid + locked. */
  const row = a.data.find((r) => r.age === 60);
  assert.equal(row.liquidNW + row.lockedNW + row.illiquidNW, row.netWorthRaw + row.cumUnfunded);
});

test("blendedReturn ignores illiquid buckets in both numerator and divisor", () => {
  const p = plan({ expectedXIRR: 12, bucketOverrides: { mf: { annualReturn: 12 } } });
  const B = { mf: 2000000, stocks: 0, crypto: 0, fdrd: 0, ppf: 0, epf: 0, nps: 0,
              lic: 0, unallocated: 0, property: 10000000 };
  /* A 1 Cr property at 5% against 20 L of equity: if property were weighted in,
     the blend would collapse toward 6%. Because the blend also feeds the FI
     bridge's discount rate, that would make FI HARDER to reach for someone who
     owns a house. */
  assert.equal(blendedReturn(p, B), 12);
});

/* ══════════════════════ Owned property ══════════════════════ */

const property = (over = {}) => ({
  id: 1, name: "Flat", value: 10000000, rentalIncome: 0, maintenancePct: 0,
  loanOutstanding: 0, loanRate: 8.5, loanRemainingYears: 0, ...over,
});

/* goals: [] deliberately. The default profile carries a financed home goal
   whose own EMI and maintenance would otherwise be mixed into the same row
   fields these tests measure. */
const propPlan = (over = {}) => plan({
  currentAge: 40, lifeExpectancy: 60, retirementAge: 60,
  incomes: [income({ amount: 100000 })],
  expenses: { household: 40000, rent: 0 },
  goals: [],
  ...over,
});

test("an owned property enters net worth as an illiquid holding", () => {
  const base = propPlan();
  const owned = propPlan({ properties: [property()] });
  const a = runProjectionV1(base).data[0];
  const b = runProjectionV1(owned).data[0];
  assert.equal(b.illiquidNW, 10000000);
  assert.equal(a.illiquidNW, 0);
  assert.equal(b.netWorthRaw - a.netWorthRaw, 10000000);
});

test("a property loan is subtracted from net worth, and amortises away", () => {
  const owned = propPlan({
    properties: [property({ loanOutstanding: 4000000, loanRemainingYears: 10 })],
  });
  const rows = runProjectionV1(owned).data;
  assert.equal(rows[0].propertyDebt, 4000000);
  assert.ok(rows.find((r) => r.age === 45).propertyDebt < 4000000);
  assert.equal(rows.find((r) => r.age === 50).propertyDebt, 0, "the loan should be repaid");
  /* Gross value in, debt out — never netted into one equity figure. */
  assert.equal(rows[0].illiquidNW, 10000000);
});

/* The line most likely to be "fixed" into a bug. */
test("owning a property does not bring financial independence forward", () => {
  const base = propPlan({ lifeExpectancy: 90 });
  const owned = propPlan({ lifeExpectancy: 90, properties: [property({ value: 50000000 })] });
  assert.equal(runProjectionV1(owned).fiAge, runProjectionV1(base).fiAge);
});

test("rental income reaches available cash and grows with inflation", () => {
  const base = propPlan({ inflationRate: 6, lifestyleCreep: 0 });
  const let_ = propPlan({
    inflationRate: 6, lifestyleCreep: 0,
    properties: [property({ rentalIncome: 25000 })],
  });
  const a = runProjectionV1(base).data;
  const b = runProjectionV1(let_).data;
  assert.equal(b[0].rentalIncome, 300000);
  assert.equal(b[0].availableCash - a[0].availableCash, 300000);
  /* Inflation only — never + lifestyleCreep, which is about how you live. */
  assert.equal(b[1].rentalIncome, Math.round(300000 * 1.06));
});

test("maintenance is charged on the current value and makes FI harder", () => {
  const owned = propPlan({
    lifeExpectancy: 90,
    properties: [property({ maintenancePct: 1 })],
  });
  const none = propPlan({ lifeExpectancy: 90, properties: [property({ maintenancePct: 0 })] });
  const withM = runProjectionV1(owned).data;
  assert.equal(withM[0].maintenanceCost, 100000);
  /* Rises with the asset, because it is a percentage of it. */
  assert.ok(withM.find((r) => r.age === 50).maintenanceCost > 100000);
  const fiA = runProjectionV1(owned).fiAge;
  const fiB = runProjectionV1(none).fiAge;
  assert.ok(fiA === null || fiB === null || fiA >= fiB,
    "a house you must maintain forever cannot make FI arrive sooner");
});

test("a property EMI is charged from year zero, unlike a goal loan", () => {
  const owned = propPlan({
    properties: [property({ loanOutstanding: 4000000, loanRemainingYears: 10 })],
  });
  const rows = runProjectionV1(owned).data;
  /* The loan is already being serviced: there is no purchase year to defer past. */
  assert.ok(rows[0].totalEMI > 0);
  assert.equal(rows.find((r) => r.age === 50).totalEMI, 0, "EMIs should end with the tenure");
});

test("a property with no loan carries no EMI and no debt", () => {
  const rows = runProjectionV1(propPlan({ properties: [property()] })).data;
  assert.equal(rows[0].totalEMI, 0);
  assert.equal(rows[0].propertyDebt, 0);
});

test("a malformed property entry does not produce NaN", () => {
  const rows = runProjectionV1(propPlan({ properties: [{ id: 1 }, null] })).data;
  assert.ok(Number.isFinite(rows[0].netWorthRaw));
  assert.equal(rows[0].illiquidNW, 0);
});
