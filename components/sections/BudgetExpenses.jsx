"use client";

import { House } from "lucide-react";
import { CollapsibleSection, SliderInput, ToggleSwitch, InfoStrip, DerivedStat, FieldError } from "@/components/ui";
import { fmt, toAnnual } from "@/lib/finance/format.mjs";
import { people, personLabel, hasMembers, SELF } from "@/lib/household/members.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

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

      {plan.expenses.rent > 0 && <StopRentCallout plan={plan} setField={setField} homeGoalAge={homeGoalAge} />}

      <div className="mt-5 space-y-2">
        <DerivedStat label="Total Monthly Living Expenses" value={fmt(monthlyExpense)}
          sub={`${fmt(monthlyExpense * 12)}/yr`} />
      </div>

      <PremiumInput plan={plan} setField={setField} premiums={premiums} />

      <SliderInput label="General Inflation" value={inflationRate} onChange={(v) => setField("inflationRate", v)} min={0} max={15} step={0.5} suffix="%" />
      <SliderInput label="Lifestyle Inflation" value={lifestyleCreep} onChange={(v) => setField("lifestyleCreep", v)} min={0} max={10} step={0.5} suffix="%" />

      <InfoStrip tone="amber">
        Expenses grow at <strong>{(inflationRate + lifestyleCreep).toFixed(1)}%</strong>/yr
      </InfoStrip>

      {hasMembers(plan) && <CostSplit plan={plan} setField={setField} scopeFor={scopeFor} findingsFor={findingsFor} />}
    </CollapsibleSection>
  );
}

/* The premium is edited here as well as on the Medical Insurance card below,
   but it is one number: this writes YOUR medical premium, the same field that
   card shows. It is typed per month and stored at the frequency you pay at, so
   a yearly policy stays yearly there. Typing a premium switches the policy on,
   otherwise the figure would be kept but never charged. A separate parents'
   policy is not folded in: it has its own premium on that card, shown here
   only as part of the total. */
function PremiumInput({ plan, setField, premiums }) {
  const self = plan.medical?.self ?? {};
  const frequency = self.premiumFrequency || "yearly";
  const perYear = toAnnual(1, frequency);
  const monthly = self.enabled ? Math.round(toAnnual(Number(self.premium) || 0, frequency) / 12) : 0;

  const setMonthly = (v) => {
    setField("medical.self.premium", Math.round((v * 12) / perYear));
    if (v > 0 && !self.enabled) setField("medical.self.enabled", true);
  };

  return (
    <div className="space-y-1">
      <SliderInput label="Medical insurance premium (₹/month)" value={monthly} onChange={setMonthly}
        min={0} max={50000} step={500} prefix="₹" showWords />
      <p className="text-[0.6rem] text-[var(--text-muted)]">
        {frequency === "monthly"
          ? "Your own policy. Also editable under Medical Insurance below."
          : `Your own policy, paid ${frequency}: ${fmt(Number(self.premium) || 0)}. Also editable under Medical Insurance below.`}
        {premiums.parents > 0 && (
          <> Parents&rsquo; policy adds {fmt(premiums.parents / 12)}/mo, so {fmt(premiums.total / 12)}/mo in all.</>
        )}
      </p>
    </div>
  );
}

/* Easy to miss as a plain toggle, and it moves the plan by years of rent, so it
   sits right under Rent in the milestone gold the home goal uses on the charts. */
function StopRentCallout({ plan, setField, homeGoalAge }) {
  return (
    <div className="rounded-lg border p-3 space-y-1.5"
      style={{ background: 'var(--brand-gold-050)', borderColor: 'var(--brand-gold-400)' }}>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'var(--brand-gold-100)', color: 'var(--brand-gold-600)' }}>
          <House size={ICON_SIZE.sm} />
        </span>
        <div className="flex-1 min-w-0">
          <ToggleSwitch value={plan.stopRentOnHomePurchase}
            onChange={(v) => setField("stopRentOnHomePurchase", v)}
            label="Stop rent after home purchase" />
        </div>
      </div>
      <p className="text-xs pl-8" style={{ color: 'var(--text-secondary)' }}>
        {homeGoalAge !== null
          ? (plan.stopRentOnHomePurchase
              ? `Rent stops at age ${homeGoalAge}, when your home goal completes.`
              : `Rent continues alongside the EMI from age ${homeGoalAge}.`)
          : "No home goal set yet. Add one in the Goal Workspace for this to take effect."}
      </p>
    </div>
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
