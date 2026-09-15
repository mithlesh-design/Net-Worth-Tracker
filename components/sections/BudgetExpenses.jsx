"use client";

import { CollapsibleSection, SliderInput, ToggleSwitch, InfoStrip, DerivedStat, FieldError } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

export default function BudgetExpenses({ plan, setField, findingsFor, premiums, homeGoalAge, defaultOpen }) {
  const monthlyExpense = plan.expenses.household + plan.expenses.rent;
  const { inflationRate, lifestyleCreep } = plan;

  return (
    <CollapsibleSection title="Budget & Expenses" defaultOpen={defaultOpen}>
      <SliderInput label="Household expenses (₹/month)" value={plan.expenses.household}
        onChange={(v) => setField("expenses.household", v)}
        min={0} max={500000} step={5000} prefix="₹" showWords
        warn={findingsFor("expenses.household").length > 0} />
      <InfoStrip tone="amber">
        Day-to-day living only. Exclude rent, insurance premiums, investments and
        loan EMIs — those are captured in their own sections.
      </InfoStrip>
      <SliderInput label="Rent (₹/month)" value={plan.expenses.rent}
        onChange={(v) => setField("expenses.rent", v)}
        min={0} max={500000} step={1000} prefix="₹" showWords
        warn={findingsFor("expenses.rent").length > 0} />

      <div className="mt-5 space-y-2">
        <DerivedStat label="Total Monthly Living Expenses" value={fmt(monthlyExpense)}
          sub={`${fmt(monthlyExpense * 12)}/yr`} />
        <DerivedStat label="Insurance premium" value={`${fmt(premiums.total / 12)}/mo`}
          sub="from Medical Insurance" tone="muted" />
      </div>

      <SliderInput label="Inflation Rate" value={inflationRate} onChange={(v) => setField("inflationRate", v)} min={0} max={15} step={0.5} suffix="%" />
      <SliderInput label="Lifestyle Creep" value={lifestyleCreep} onChange={(v) => setField("lifestyleCreep", v)} min={0} max={10} step={0.5} suffix="%" />

      {plan.expenses.rent > 0 && (
        <div className="mt-5">
          <ToggleSwitch value={plan.stopRentOnHomePurchase}
            onChange={(v) => setField("stopRentOnHomePurchase", v)}
            label="Stop rent after a home purchase" />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {homeGoalAge !== null
              ? (plan.stopRentOnHomePurchase
                  ? `Rent stops at age ${homeGoalAge}, when your home goal completes.`
                  : `Rent continues alongside the EMI from age ${homeGoalAge}.`)
              : "No home goal set, so this has no effect yet."}
          </p>
        </div>
      )}

      <InfoStrip tone="amber">
        Expenses grow at <strong>{(inflationRate + lifestyleCreep).toFixed(1)}%</strong>/yr
      </InfoStrip>
    </CollapsibleSection>
  );
}
