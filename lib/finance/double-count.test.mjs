/* ═══════════════════════════════════════════════════════════════════════════
   DOUBLE-COUNT INVARIANTS

   The completion criteria require that monthly contributions, current balances,
   premiums and coverage are never double counted. Each test below changes ONE
   input and asserts the total moves by that amount and not by twice it.
   ═══════════════════════════════════════════════════════════════════════════ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { runProjectionV1 } from "./projection.mjs";
import { buildContributionPlan } from "./contributions.mjs";
import { annualPremium } from "./insurance.mjs";
import { migrate } from "../profile/migrate.mjs";
import { FIRST_RUN_V0 } from "../profile/schema.mjs";

const base = () => migrate(FIRST_RUN_V0);
const withPlan = (mutate) => { const p = base(); mutate(p); return p; };

/* 1. Aggregate net worth vs the holdings it represents */
test("moving the aggregate into a named holding leaves the total unchanged", () => {
  const before = runProjectionV1(base()).openingPortfolio;
  const after = runProjectionV1(withPlan((p) => {
    p.holdings.mf = 200000;
    p.holdings.unallocated -= 200000;   // the reconciliation action
  })).openingPortfolio;
  assert.equal(after, before, "reallocating within holdings changed the total");
});

test("adding a holding without reducing the aggregate adds exactly once", () => {
  const before = runProjectionV1(base()).openingPortfolio;
  const after = runProjectionV1(withPlan((p) => { p.holdings.mf = 200000; })).openingPortfolio;
  assert.equal(after - before, 200000, "the holding was counted more than once");
});

/* 2. Aggregate SIP target vs detailed contributions */
test("the aggregate SIP and the detailed total are never summed", () => {
  const p = withPlan((x) => { x.contributions.mfSip.amount = 50000; });
  const cplan = buildContributionPlan(p);
  assert.equal(cplan.useDetailed, true);
  assert.equal(cplan.detailedMonthly, 50000);
  assert.equal(p.legacy.monthlyInvestment, 50000, "the aggregate is preserved, not deleted");

  const detailedRow = runProjectionV1(p).data[1];
  const aggregateRow = runProjectionV1(base()).data[1];
  assert.ok(Math.abs(detailedRow.invested - aggregateRow.invested) < 1000,
    `detailed ${detailedRow.invested} vs aggregate ${aggregateRow.invested}: summed, not swapped`);
});

test("clearing every detailed amount restores the aggregate", () => {
  const p = withPlan((x) => { x.contributions.mfSip.amount = 0; });
  assert.equal(buildContributionPlan(p).useDetailed, false);
  assert.equal(p.legacy.monthlyInvestment, 50000);
});

/* 3. Shared family medical premium */
test("a premium marked as included on the self policy is charged once", () => {
  const separate = withPlan((p) => {
    p.medical.self = { enabled: true, coverage: 1000000, premium: 20000, premiumFrequency: "yearly" };
    p.medical.parents = { enabled: true, coverage: 1000000, premium: 30000, premiumFrequency: "yearly", premiumMode: "separate" };
  });
  const included = withPlan((p) => {
    p.medical.self = { enabled: true, coverage: 1000000, premium: 20000, premiumFrequency: "yearly" };
    p.medical.parents = { enabled: true, coverage: 1000000, premium: 30000, premiumFrequency: "yearly", premiumMode: "includedInSelfPolicy" };
  });
  assert.equal(annualPremium(separate.medical).total, 50000);
  assert.equal(annualPremium(included.medical).total, 20000);
  // The typed 30,000 is preserved, not erased.
  assert.equal(included.medical.parents.premium, 30000);
});

/* 4. LIC premium as both an outflow and an asset */
test("a LIC premium leaves cash without becoming an asset by default", () => {
  const p = withPlan((x) => {
    x.contributions.lic.amount = 10000;
    x.licInvestablePct = 0;
    x.investSurplus = false;
  });
  const row = runProjectionV1(p).data[1];
  assert.equal(row.buckets.lic, 0, "the whole premium was banked as savings");
  assert.ok(buildContributionPlan(p).cashAnnual >= 120000, "but it must still leave the account");
});

/* 5. EPF under a take-home salary */
test("a payroll contribution is not deducted from take-home pay twice", () => {
  const noEpf = withPlan((p) => {
    p.incomes = [{ ...p.incomes[0] }];
    p.contributions.epf.amount = 0;
  });
  const withEpf = withPlan((p) => {
    p.incomes = [{ ...p.incomes[0] }];
    p.contributions.epf.amount = 10000;
    p.contributions.epf.fundedFromPayroll = true;
  });
  const a = runProjectionV1(noEpf).data[1];
  const b = runProjectionV1(withEpf).data[1];
  assert.equal(a.availableCash, b.availableCash, "EPF was subtracted from cash that never held it");
  assert.ok(b.buckets.epf > 0, "but it must still accrue");
});

test("a cash-funded contribution reduces the leftover surplus", () => {
  /* Both plans are already in detailed mode, so this isolates the effect of the
     amount itself rather than the swap from aggregate to detailed.
     investSurplus is off so leftover cash is not swept back into investments. */
  const small = withPlan((p) => {
    p.incomes = [{ ...p.incomes[0] }];
    p.investSurplus = false;
    p.contributions.mfSip.amount = 10000;
    p.contributions.mfSip.stepUp = 0;     // isolate the amount from the step-up
  });
  const large = withPlan((p) => {
    p.incomes = [{ ...p.incomes[0] }];
    p.investSurplus = false;
    p.contributions.mfSip.amount = 30000;
    p.contributions.mfSip.stepUp = 0;
  });
  const a = runProjectionV1(small).data[1];
  const b = runProjectionV1(large).data[1];

  // Available cash is measured before contributions, so it is unchanged.
  assert.equal(a.availableCash, b.availableCash);
  // The extra 20,000/month is contributed, and comes out of the surplus.
  assert.equal(b.actualContribution - a.actualContribution, 20000 * 12);
  assert.equal(a.surplusSpent - b.surplusSpent, 20000 * 12,
    "the extra contribution was not taken out of the surplus");
});

test("switching from the aggregate to detailed swaps, it does not add", () => {
  const aggregate = withPlan((p) => {
    p.incomes = [{ ...p.incomes[0] }];
    p.investSurplus = false;
    p.legacy.monthlyInvestment = 10000;
  });
  const detailed = withPlan((p) => {
    p.incomes = [{ ...p.incomes[0] }];
    p.investSurplus = false;
    p.legacy.monthlyInvestment = 10000;   // still present, must be ignored
    p.contributions.mfSip.amount = 10000;
    p.contributions.mfSip.stepUp = p.investmentStepUp;  // match the aggregate's
  });
  const a = runProjectionV1(aggregate).data[1];
  const b = runProjectionV1(detailed).data[1];
  assert.equal(a.actualContribution, b.actualContribution,
    "the aggregate and the detailed amount were both applied");
});

/* 6. Life insurance sum assured */
test("a sum assured never enters net worth; a cash value does, once", () => {
  const before = runProjectionV1(base()).openingPortfolio;
  const cover = runProjectionV1(withPlan((p) => {
    p.lifeInsurance = { value: 10000000, valueType: "sumAssured", surrenderValue: null };
  })).openingPortfolio;
  const cash = runProjectionV1(withPlan((p) => {
    p.lifeInsurance = { value: 300000, valueType: "surrenderValue", surrenderValue: null };
  })).openingPortfolio;
  assert.equal(cover, before, "a death benefit was counted as wealth");
  assert.equal(cash - before, 300000, "the cash value was counted more than once");
});

/* 7. Medical coverage */
test("medical coverage is never added to net worth", () => {
  const before = runProjectionV1(base()).openingPortfolio;
  const after = runProjectionV1(withPlan((p) => {
    p.medical.self = { enabled: true, coverage: 5000000, premium: 0, premiumFrequency: "yearly" };
  })).openingPortfolio;
  assert.equal(after, before);
});

/* 8. Rent vs household expenses */
test("rent and household are added once each, not folded together twice", () => {
  const a = runProjectionV1(withPlan((p) => {
    p.expenses.household = 50000; p.expenses.rent = 0;
  })).data[1].annualExpense;
  const b = runProjectionV1(withPlan((p) => {
    p.expenses.household = 50000; p.expenses.rent = 20000;
  })).data[1].annualExpense;
  const inflation = b / (50000 + 20000) / 12;
  assert.ok(Math.abs((b - a) - 20000 * 12 * inflation) < 1,
    `rent added ${b - a} rather than one year's worth`);
});

/* 9. Surplus vs contributions */
test("surplus is what remains after contributions, not the whole cash flow", () => {
  const p = withPlan((x) => {
    x.investSurplus = true;
    x.contributions.mfSip.amount = 20000;
  });
  const row = runProjectionV1(p).data[1];
  assert.equal(Math.round(row.invested), Math.round(Math.max(0, row.availableCash)),
    "contributions were invested and then counted again as surplus");
});

/* 10. FD and RD combine without either being lost or doubled */
test("FD and RD sum into one bucket exactly once", () => {
  const out = runProjectionV1(withPlan((p) => { p.holdings.fd = 300000; p.holdings.rd = 200000; }));
  assert.equal(out.data[0].buckets.fdrd, 500000);
});
