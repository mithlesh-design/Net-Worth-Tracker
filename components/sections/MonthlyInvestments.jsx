"use client";

import { X } from "lucide-react";
import {
  CollapsibleSection, SliderInput, SegmentedControl, ItemCard,
  AddItemButton, InfoStrip, DerivedStat, TextField, FieldError,
} from "@/components/ui";
import ContributionBlock from "./ContributionBlock";
import { fmt, monthlyEquivalent, toAnnual } from "@/lib/finance/format.mjs";
import { PPF_ANNUAL_CAP } from "@/lib/finance/assumptions.mjs";
import { NAMED_CONTRIBUTIONS } from "@/lib/profile/schema.mjs";

const FREQUENCIES = ["monthly", "quarterly", "yearly"];

/* Client fields 10-16. Seven expandable calculators sharing one component, each
   linked to the holding it feeds. */
export default function MonthlyInvestments({ plan, setField, findingsFor, cplan, makeId }) {
  const c = plan.contributions;
  const yearsToRetire = Math.max(0, plan.retirementAge - (plan.currentAge ?? 0));
  const common = { plan, setField, findingsFor, yearsToRetire };

  const ppfAnnual = toAnnual(c.ppf.amount, c.ppf.frequency);
  const thisYear = new Date().getFullYear();

  const addOther = () => setField("contributions.other", [
    ...c.other,
    { id: makeId(), name: "", amount: 0, frequency: "monthly", annualReturn: null,
      stepUp: plan.investmentStepUp, fundedFromPayroll: false },
  ]);
  const updateOther = (id, key, val) => setField("contributions.other",
    c.other.map((o) => (o.id === id ? { ...o, [key]: val } : o)));
  const removeOther = (id) => setField("contributions.other", c.other.filter((o) => o.id !== id));

  return (
    <CollapsibleSection title="Monthly Investments" defaultOpen={false}
      badge={cplan.detailedMonthly > 0 ? fmt(cplan.detailedMonthly) : null}>

      <ContributionBlock {...common} keyName="mfSip" label="Mutual Fund SIPs" cfg={c.mfSip}
        bucket="mf" holdingKey="mf" holdingLabel="Current value of Mutual Funds (₹)" />

      <ContributionBlock {...common} keyName="nps" label="NPS Contribution" cfg={c.nps}
        bucket="nps" holdingKey="nps" holdingLabel="Current value of NPS (₹)"
        allowPayroll
        note={<InfoStrip tone="amber">
          NPS is market-linked, so its return is an estimate rather than a declared rate.
          Locked until age 60. The mandatory annuity share at exit is not modelled here,
          so spendable corpus is shown at its most optimistic.
        </InfoStrip>} />

      <ContributionBlock {...common} keyName="ppf" label="PPF Contribution" cfg={c.ppf}
        bucket="ppf" holdingKey="ppf" holdingLabel="Current value of PPF (₹)"
        extra={
          <SliderInput label="Account opened (year)"
            value={plan.ppfOpenedYear ?? thisYear}
            onChange={(v) => setField("ppfOpenedYear", v)}
            min={thisYear - 40} max={thisYear} step={1} />
        }
        note={<>
          {ppfAnnual > PPF_ANNUAL_CAP && (
            <InfoStrip tone="amber">
              Deposits above ₹{PPF_ANNUAL_CAP.toLocaleString("en-IN")} a year earn no
              interest. The projection caps contributions at this limit.
            </InfoStrip>
          )}
          <InfoStrip tone="blue">
            Matures 15 years after the end of the financial year the account was opened,
            not at a fixed age.
          </InfoStrip>
        </>} />

      <ContributionBlock {...common} keyName="epf" label="EPF Contribution" cfg={c.epf}
        bucket="epf" holdingKey="epf"
        holdingLabel="Current value of EPF (₹)"
        holdingHint="Your passbook total, including the employer share and interest."
        allowPayroll
        extra={
          <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
            <SliderInput label="Employer contribution (₹/month)"
              value={c.epfEmployer.amount}
              onChange={(v) => setField("contributions.epfEmployer.amount", v)}
              min={0} max={100000} step={500} prefix="₹" />
            <p className="text-[0.55rem] mt-1" style={{ color: 'var(--text-muted)' }}>
              Usually matches your own deduction. It is in neither gross nor take-home
              pay, so it is never subtracted from your cash.
            </p>
          </div>
        }
        note={<InfoStrip tone="blue">
          Enter your own deduction above, employee share only. Locked until age 58.
        </InfoStrip>} />

      <ContributionBlock {...common} keyName="rd" label="Recurring Deposits (RDs)" cfg={c.rd}
        bucket="fdrd" holdingKey="rd" holdingLabel="Current RD balance (₹)"
        holdingHint="Balance today, not the maturity value. Combined with FD in Current Holdings." />

      <ContributionBlock {...common} keyName="lic" label="LIC Insurance Premiums" cfg={c.lic}
        bucket="lic"
        extra={
          <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
            <SliderInput label="Investable portion of premium"
              value={plan.licInvestablePct}
              onChange={(v) => setField("licInvestablePct", v)}
              min={0} max={100} step={5} suffix="%" />
          </div>
        }
        note={<InfoStrip tone="amber">
          A premium is an outflow. Only the part that builds cash value is treated as an
          asset, and that defaults to 0% because term cover never builds any. Raise it
          only for an endowment or money-back policy.
        </InfoStrip>} />

      {/* Client field 16: Other (please specify) */}
      <div className="space-y-2">
        <div className="text-[0.58rem] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
          Other
        </div>
        {c.other.map((o, i) => {
          const nameMissing = (o.amount ?? 0) > 0 && !String(o.name ?? "").trim();
          const collides = NAMED_CONTRIBUTIONS.includes(String(o.name ?? "").trim().toLowerCase());
          return (
            <ItemCard key={o.id}>
              <div className="flex items-center justify-between gap-2">
                <input type="text" value={o.name} placeholder="Name this contribution"
                  onChange={(e) => updateOther(o.id, "name", e.target.value)}
                  className="text-xs font-bold bg-transparent outline-none flex-1 min-w-0"
                  style={{ color: nameMissing ? 'var(--info-red-text)' : 'var(--text-primary)' }} />
                <span className="text-[0.6rem] font-bold text-emerald-500 shrink-0">
                  {fmt(monthlyEquivalent(o.amount, o.frequency))}/mo
                </span>
                <button onClick={() => removeOther(o.id)} className="hover:text-rose-400 shrink-0"
                  style={{ color: 'var(--text-muted)' }}><X size={12} /></button>
              </div>
              <SliderInput label={`Amount (${o.frequency})`} value={o.amount}
                onChange={(v) => updateOther(o.id, "amount", v)}
                min={0} max={500000} step={500} prefix="₹" warn={nameMissing} />
              <SegmentedControl label="Frequency" options={FREQUENCIES} value={o.frequency}
                onChange={(v) => updateOther(o.id, "frequency", v)} />
              <SliderInput label="Expected annual return" value={o.annualReturn ?? plan.expectedXIRR}
                onChange={(v) => updateOther(o.id, "annualReturn", v)}
                min={0} max={25} step={0.5} suffix="%" />
              <SliderInput label="Annual contribution increase" value={o.stepUp ?? 0}
                onChange={(v) => updateOther(o.id, "stepUp", v)}
                min={0} max={30} step={1} suffix="%" />
              {nameMissing && (
                <InfoStrip tone="red">Name this contribution so it can be identified later.</InfoStrip>
              )}
              {collides && (
                <InfoStrip tone="amber">
                  This duplicates a category above and will be counted twice.
                </InfoStrip>
              )}
            </ItemCard>
          );
        })}
        <AddItemButton onClick={addOther} label="Add Other Contribution" tone="violet" />
      </div>

      {/* Totals */}
      <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-secondary)' }}>
        <DerivedStat label="Total Monthly Contributions" value={`${fmt(cplan.detailedMonthly)}/mo`}
          sub={`${fmt(cplan.detailedAnnual)}/yr`} />
        <DerivedStat label="From payroll" value={`${fmt(cplan.payrollMonthly)}/mo`}
          sub="already deducted from your pay" tone="muted" />
        <DerivedStat label="From take-home cash" value={`${fmt(cplan.cashMonthly)}/mo`} tone="muted" />
      </div>

      {cplan.useDetailed && plan.legacy.monthlyInvestment > 0 && (
        <InfoStrip tone="blue">
          These detailed contributions replace the aggregate Monthly SIP target of{" "}
          {fmt(plan.legacy.monthlyInvestment)}/mo in Investment Strategy. They are never
          added together. Clear every amount above to go back to the aggregate.
        </InfoStrip>
      )}
    </CollapsibleSection>
  );
}
