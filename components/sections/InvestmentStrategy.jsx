"use client";

import { ShieldCheck } from "lucide-react";
import { CollapsibleSection, SliderInput, ToggleSwitch, InfoStrip, DerivedStat } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { ASSUMPTIONS_AS_OF } from "@/lib/finance/assumptions.mjs";

export default function InvestmentStrategy({
  plan, setField, cplan, simulation, totalHoldings,
  monthlyInvestment, setMonthlyInvestment,
  expectedXIRR, setExpectedXIRR,
  investmentStepUp, setInvestmentStepUp,
  investSurplus, setInvestSurplus,
  postRetireReturn, setPostRetireReturn,
  ratesAreCustom, blendedNow, resetAllRates,
  earliestRetireAge, defaultOpen,
}) {
  return (
    <CollapsibleSection title="Investment Strategy" defaultOpen={defaultOpen}>
      <DerivedStat label="Starting Portfolio" value={fmt(simulation.openingPortfolio)}
        sub={simulation.openingPortfolio !== totalHoldings
          ? `${fmt(totalHoldings)} holdings + ${fmt(simulation.openingPortfolio - totalHoldings)} insurance cash value`
          : "total of Current Holdings above"} />

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
        <SliderInput label="Monthly SIP (Target)" value={monthlyInvestment} onChange={setMonthlyInvestment} min={0} max={500000} step={5000} prefix="₹" showWords />
      )}

      <SliderInput label="Annual Step-Up" value={investmentStepUp} onChange={setInvestmentStepUp} min={0} max={30} suffix="%" />

      {ratesAreCustom ? (
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
        <SliderInput label="Expected XIRR (Working)" value={expectedXIRR} onChange={setExpectedXIRR} min={1} max={25} step={0.5} suffix="%" />
      )}

      <SliderInput label="Post-Retirement Return" value={postRetireReturn} onChange={setPostRetireReturn} min={1} max={15} step={0.5} suffix="%" />

      <InfoStrip tone="amber">
        Each instrument uses its own assumed return, editable in Monthly
        Investments. These are estimates, not guaranteed rates. Post-retirement
        return applies as a cap, so a contractual PPF or EPF rate is not reduced.
        Assumptions checked {ASSUMPTIONS_AS_OF}.
      </InfoStrip>
      <div className="mt-4 space-y-2">
        <ToggleSwitch value={investSurplus} onChange={setInvestSurplus} label="Invest all surplus cash" />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {investSurplus
            ? "All cash after expenses/EMIs goes into investments."
            : "Only the Target SIP is invested. Remaining surplus is spent (lifestyle)."}
        </p>
      </div>
      <div className="rounded-lg border px-3 py-2 text-[0.6rem] flex items-center gap-1.5"
        style={{ background: 'var(--info-blue-bg)', borderColor: 'var(--info-blue-border)', color: 'var(--info-blue-text)' }}>
        <ShieldCheck size={10} /> Returns switch to {postRetireReturn}% at age {earliestRetireAge}
      </div>
    </CollapsibleSection>
  );
}
