"use client";

import { CollapsibleSection, SliderInput, ToggleSwitch, InfoStrip, DerivedStat, FieldError } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { people, personLabel, hasMembers, SELF } from "@/lib/household/members.mjs";

export default function BudgetExpenses({ plan, setField, findingsFor, premiums, homeGoalAge, defaultOpen, scopeFor }) {
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

      {hasMembers(plan) && <CostSplit plan={plan} setField={setField} scopeFor={scopeFor} findingsFor={findingsFor} />}
    </CollapsibleSection>
  );
}

/* Who carries these costs on their OWN Strategy Hub tab. It sits beside the
   costs it divides rather than on each member's card, so the whole split and
   its total are visible in one place.

   The household projection on Review ignores it: whoever is included, the
   household's costs count in full. */
function CostSplit({ plan, setField, scopeFor, findingsFor }) {
  const everyone = people(plan);
  const total = everyone.reduce((s, p) => s + (Number(p.costShare) || 0), 0);
  const setShare = (id, v) => (id === SELF
    ? setField("household.selfCostShare", v)
    : scopeFor(id).setField("costShare", v));

  return (
    <div className="mt-2 space-y-3 border-t pt-4 border-[var(--border-subtle)]">
      <div>
        <div className="text-xs font-semibold text-[var(--text-primary)]">Who covers these costs</div>
        <p className="text-xs mt-0.5 text-[var(--text-muted)]">
          Each person&rsquo;s own Strategy Hub tab carries their share of expenses,
          premiums and goals. Household totals on Review always count them in full.
        </p>
      </div>
      {everyone.map((p) => (
        <SliderInput key={p.id}
          label={p.id === SELF ? "You" : personLabel(plan, p.id)}
          value={p.costShare} onChange={(v) => setShare(p.id, v)}
          min={0} max={100} step={5} suffix="%" />
      ))}
      <DerivedStat label="Total" value={`${Math.round(total)}%`}
        tone={Math.abs(total - 100) > 0.5 ? "warn" : "default"} />
      <FieldError findings={findingsFor("household.costShares")} />
    </div>
  );
}
