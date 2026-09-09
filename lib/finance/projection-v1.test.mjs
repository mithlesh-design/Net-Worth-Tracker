import { test } from "node:test";
import assert from "node:assert/strict";
import { runProjectionV1 } from "./projection.mjs";
import { freshDefaults } from "../profile/schema.mjs";
import { BUCKET_NAMES } from "../profile/schema.mjs";

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
  basis: "gross", growthRate: 0, retireAge: 60, ...over,
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

/* ══════════════════════ Tax ══════════════════════ */

test("tax is computed on the aggregate gross pool, not summed per source", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40, retirementAge: 60,
    incomes: [
      income({ id: 1, amount: 1200000, frequency: "yearly" }),
      income({ id: 2, amount: 1200000, frequency: "yearly", role: "other" }),
    ],
  });
  const row = runProjectionV1(p).data[1];
  // Each source alone falls under the rebate and would be taxed at zero.
  // Together they must not be.
  assert.ok(row.incomeTax > 200000,
    `expected real tax on a 24L pool, got ${row.incomeTax}`);
});

test("take-home income is not taxed a second time", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40,
    incomes: [income({ amount: 1200000, frequency: "yearly", basis: "takehome" })],
  });
  assert.equal(runProjectionV1(p).data[1].incomeTax, 0);
});

test("a mixed gross and take-home pool taxes only the gross part", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 40,
    incomes: [
      income({ id: 1, amount: 1200000, frequency: "yearly", basis: "gross" }),
      income({ id: 2, amount: 1200000, frequency: "yearly", basis: "takehome" }),
    ],
  });
  // The gross 12L alone falls under the rebate.
  assert.equal(runProjectionV1(p).data[1].incomeTax, 0);
});

/* ══════════════════════ Contributions ══════════════════════ */

test("payroll-funded EPF still lands in the bucket during a deficit year", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 20000, basis: "takehome" })],
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
    incomes: [income({ amount: 100000, basis: "takehome" })],
    expenses: { household: 30000, rent: 0 },
  });
  const withEpf = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 100000, basis: "takehome" })],
    expenses: { household: 30000, rent: 0 },
    contributions: { epf: contrib({ amount: 10000, fundedFromPayroll: true }) },
  });
  assert.equal(runProjectionV1(base).data[1].availableCash,
               runProjectionV1(withEpf).data[1].availableCash,
               "payroll money was deducted from cash that never held it");
});

test("the aggregate SIP target is ignored once any detailed contribution exists", () => {
  const shared = { currentAge: 30, lifeExpectancy: 50, investSurplus: false,
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
    incomes: [income({ amount: 200000, basis: "takehome" })],
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
    incomes: [income({ amount: 40000, basis: "takehome" })],
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
    incomes: [income({ amount: 500000, basis: "takehome" })],
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
  const shared = { currentAge: 30, lifeExpectancy: 35, medicalInflation: 0,
                   incomes: [income({ basis: "takehome" })] };
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
    currentAge: 30, lifeExpectancy: 35, medicalInflation: 0,
    incomes: [income({ basis: "takehome" })],
    medical: { self: { enabled: true, coverage: 500000, premium: 24000, premiumFrequency: "yearly" } },
  });
  assert.equal(runProjectionV1(p).data[1].insurancePremium, 24000);
});

test("a disabled policy charges nothing even with a premium recorded", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ basis: "takehome" })],
    medical: { self: { enabled: false, coverage: 500000, premium: 24000, premiumFrequency: "yearly" } },
  });
  assert.equal(runProjectionV1(p).data[1].insurancePremium, 0);
});

/* ══════════════════════ LIC ══════════════════════ */

test("a LIC premium is an outflow, not an asset, by default", () => {
  const p = plan({
    currentAge: 30, lifeExpectancy: 35,
    incomes: [income({ amount: 200000, basis: "takehome" })],
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
    incomes: [income({ amount: 200000, basis: "takehome" })],
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
    inflationRate: 0, lifestyleCreep: 0, medicalInflation: 0,
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
    expectedXIRR: 0, postRetireReturn: 0, inflationRate: 0, lifestyleCreep: 0,
    medicalInflation: 0, investSurplus: false, investmentStepUp: 0,
    bucketOverrides: zeroReturns(),
    incomes: [income({ amount: 100000, basis: "takehome", retireAge: 99 })],
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
    expectedXIRR: 0, postRetireReturn: 0, inflationRate: 0, lifestyleCreep: 0,
    medicalInflation: 0, investSurplus: false, investmentStepUp: 0,
    exitTaxRate: 12.5,
    bucketOverrides: zeroReturns(),
    incomes: [income({ amount: 100000, basis: "takehome", retireAge: 40 })],
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
    "totalLoanOutstanding", "grossIncome", "incomeTax", "postTaxIncome",
    "annualExpense", "totalEMI", "maintenanceCost", "availableCash",
    "targetInvestment", "invested", "surplusSpent", "goalCost", "goalCostGross",
    "deficit", "constrained", "isRetired", "returnRate",
  ];
  for (const f of v0Fields) assert.ok(f in row, `${f} is missing from the row`);
});
