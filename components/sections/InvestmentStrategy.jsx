"use client";

import { ShieldCheck } from "lucide-react";
import { CollapsibleSection, SliderInput, ToggleSwitch, InfoStrip, DerivedStat } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { ASSUMPTIONS_AS_OF } from "@/lib/finance/assumptions.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Is any instrument priced away from the single expected-return slider? Then
   that slider no longer describes the portfolio, and a blended figure does. */
function ratesAreCustom(plan) {
  if (Object.values(plan.bucketOverrides ?? {}).some((o) => o?.annualReturn != null)) return true;
  return Object.values(plan.contributions ?? {}).some(
    (c) => c && !Array.isArray(c) && c.annualReturn != null);
}

const withDefaultReturns = (contributions = {}) => Object.fromEntries(
  Object.entries(contributions).map(([k, c]) => [k, Array.isArray(c)
    ? c.map((o) => ({ ...o, annualReturn: null }))
    : { ...c, annualReturn: null }]));

/* One person's strategy. `plan` is that person's view (see
   lib/household/members.mjs) and `setField` writes relative to them, so the
   same card serves you and every household member. */
export default function InvestmentStrategy({
  plan, setField, cplan, simulation, totalHoldings, defaultOpen,
}) {
  const {
    expectedXIRR, investmentStepUp, investSurplus, postRetireReturn, retirementAge,
  } = plan;
  const monthlyInvestment = plan.legacy?.monthlyInvestment ?? 0;
  const custom = ratesAreCustom(plan);
  const blendedNow = simulation.data[0]?.blendedReturn ?? expectedXIRR;
  const resetAllRates = () => {
    setField("bucketOverrides", {});
    setField("contributions", withDefaultReturns(plan.contributions));
  };

  /* Named part by part. The starting portfolio also holds a life-insurance
     cash value and owned property, and labelling the whole gap as one of them
     would misname the other. */
  const today = simulation.data[0];
  const licCash = today?.buckets?.lic ?? 0;
  const property = today?.illiquidNW ?? 0;
  const parts = [
    `${fmt(totalHoldings)} holdings`,
    licCash > 0 && `${fmt(licCash)} insurance cash value`,
    property > 0 && `${fmt(property)} property`,
  ].filter(Boolean);

  return (
    <CollapsibleSection title="Investment Strategy" defaultOpen={defaultOpen}>
      <DerivedStat label="Starting Portfolio" value={fmt(simulation.openingPortfolio)}
        sub={parts.length > 1 ? parts.join(" + ") : "total of Current Holdings"} />

      {cplan.useDetailed ? (
        <>
          <DerivedStat label="Monthly Contributions" value={fmt(cplan.detailedMonthly)}
            sub="from Monthly Investments" />
          <InfoStrip tone="blue">
            Your detailed contributions replace the aggregate SIP target. They are
            never added together.
          </InfoStrip>
        </>
      ) : (
        <SliderInput label="Monthly SIP (Target)" value={monthlyInvestment} onChange={(v) => setField("legacy.monthlyInvestment", v)} min={0} max={500000} step={5000} prefix="₹" showWords />
      )}

      <SliderInput label="Annual Step-Up" value={investmentStepUp} onChange={(v) => setField("investmentStepUp", v)} min={0} max={30} suffix="%" />

      {custom ? (
        <>
          <DerivedStat label="Blended Portfolio Return" value={`${blendedNow.toFixed(1)}%`}
            sub="weighted by what you actually hold" />
          <button onClick={resetAllRates}
            className="w-full rounded-lg border py-1.5 text-[0.6rem] font-bold transition"
            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
            Set all instruments to {expectedXIRR}%
          </button>
        </>
      ) : (
        <SliderInput label="Expected XIRR (Working)" value={expectedXIRR} onChange={(v) => setField("expectedXIRR", v)} min={1} max={25} step={0.5} suffix="%" />
      )}

      <SliderInput label="Post-Retirement Return" value={postRetireReturn} onChange={(v) => setField("postRetireReturn", v)} min={1} max={15} step={0.5} suffix="%" />

      <InfoStrip tone="amber">
        Each instrument uses its own assumed return, editable in Monthly
        Investments. These are estimates, not guaranteed rates. Post-retirement
        return applies as a cap, so a contractual PPF or EPF rate is not reduced.
        Assumptions checked {ASSUMPTIONS_AS_OF}.
      </InfoStrip>
      <div className="mt-4 space-y-2">
        <ToggleSwitch value={investSurplus} onChange={(v) => setField("investSurplus", v)} label="Invest all surplus cash" />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {investSurplus
            ? "All cash after expenses/EMIs goes into investments."
            : "Only the Target SIP is invested. Remaining surplus is spent (lifestyle)."}
        </p>
      </div>
      <div className="rounded-lg border px-3 py-2 text-[0.6rem] flex items-center gap-1.5"
        style={{ background: 'var(--info-blue-bg)', borderColor: 'var(--info-blue-border)', color: 'var(--info-blue-text)' }}>
        <ShieldCheck size={ICON_SIZE.xs} /> Returns switch to {postRetireReturn}% at age {retirementAge}
      </div>
    </CollapsibleSection>
  );
}
