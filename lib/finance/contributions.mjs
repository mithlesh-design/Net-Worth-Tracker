/* ═══════════════════════════════════════════════════════════════════════════
   CONTRIBUTION PLAN

   Turns the seven client contribution streams into items the engine can apply,
   and answers the two questions that decide double-counting:

   1. Detailed or aggregate? The v0 "Monthly SIP (Target)" slider and the new
      per-instrument amounts describe the same money. They are MUTUALLY
      EXCLUSIVE and never summed. `useDetailed` picks one.

   2. Cash or payroll? An EPF deduction never reaches the bank account, so it
      must not be subtracted from available cash a second time — and it must
      still land in the bucket even in a year with no surplus. That is why this
      returns two separate totals: only `cashAnnual` is capped by available
      cash. Employer EPF is in neither gross nor take-home pay, so it is
      payroll-funded too.
   ═══════════════════════════════════════════════════════════════════════════ */

import { toAnnual } from "./format.mjs";
import { CONTRIBUTION_BUCKET, NAMED_CONTRIBUTIONS } from "../profile/schema.mjs";
import { PPF_ANNUAL_CAP } from "./assumptions.mjs";

export function buildContributionPlan(plan) {
  const c = plan?.contributions ?? {};

  const named = [...NAMED_CONTRIBUTIONS, "epfEmployer"]
    .filter((key) => c[key])
    .map((key) => ({ key, bucket: CONTRIBUTION_BUCKET[key], cfg: c[key] }));

  /* "Other" entries feed the mutual-fund bucket by default: they are
     discretionary investments with no statutory lock. */
  const others = (Array.isArray(c.other) ? c.other : [])
    .filter((o) => o && (Number(o.amount) || 0) > 0)
    .map((o) => ({ key: `other:${o.id}`, bucket: o.bucket || "mf", cfg: o, name: o.name }));

  const items = [...named, ...others].map(({ key, bucket, cfg, name }) => ({
    key,
    bucket,
    name: name ?? key,
    /* Never a raw * 12: these carry their own frequency. */
    annualBase: toAnnual(Number(cfg.amount) || 0, cfg.frequency || "monthly"),
    stepUp: cfg.stepUp ?? plan.investmentStepUp ?? 0,
    /* Only the declared investable fraction of a LIC premium becomes an asset.
       The default is 0, because for term cover none of it ever does. Zero can
       never overstate net worth; a user with an endowment policy opts in. */
    assetFactor: key === "lic" ? (Number(plan.licInvestablePct) || 0) / 100 : 1,
    fundedFromPayroll: !!cfg.fundedFromPayroll,
    /* Statutory ceiling, applied per year in the engine after the step-up. */
    annualCap: bucket === "ppf" ? PPF_ANNUAL_CAP : Infinity,
  }));

  const detailedAnnual = items.reduce((s, i) => s + i.annualBase, 0);
  const cashAnnual = items.filter((i) => !i.fundedFromPayroll)
    .reduce((s, i) => s + i.annualBase, 0);
  const payrollAnnual = items.filter((i) => i.fundedFromPayroll)
    .reduce((s, i) => s + i.annualBase, 0);

  return {
    items,
    detailedAnnual,
    detailedMonthly: detailedAnnual / 12,
    cashAnnual,
    cashMonthly: cashAnnual / 12,
    payrollAnnual,
    payrollMonthly: payrollAnnual / 12,
    /* Derived, never stored, so it cannot drift out of sync with the amounts
       and cannot fight the user via a state-syncing effect. */
    useDetailed: detailedAnnual > 0,
  };
}

/* This year's contribution for one item: its base grown by its own step-up,
   then capped where a statutory ceiling applies. Without the cap a 30% step-up
   blows through the PPF ceiling in six years and the projection credits
   deposits that would earn no interest. */
export function steppedContribution(item, year) {
  const raw = item.annualBase * Math.pow(1 + (item.stepUp || 0) / 100, year);
  return Math.min(raw, item.annualCap ?? Infinity);
}

/* The annual amount actually planned from take-home cash in a given year. */
export function plannedCashForYear(cplan, plan, year) {
  if (cplan.useDetailed) {
    return cplan.items
      .filter((i) => !i.fundedFromPayroll)
      .reduce((s, i) => s + steppedContribution(i, year), 0);
  }
  const base = (Number(plan.legacy?.monthlyInvestment) || 0) * 12;
  return base * Math.pow(1 + (Number(plan.investmentStepUp) || 0) / 100, year);
}
