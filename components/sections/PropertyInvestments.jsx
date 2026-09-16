"use client";

import { X } from "lucide-react";
import {
  CollapsibleSection, SliderInput, InfoStrip, DerivedStat, ItemCard, AddItemButton,
} from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { BUCKET_DEFS } from "@/lib/finance/assumptions.mjs";
import { effectiveAge } from "@/lib/finance/age.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Property the user already owns. A home they plan to BUY is a goal — the goal
   machinery already charges its down payment, EMI and maintenance, so entering
   it here too would count it twice. The two are disjoint in time by
   construction; the copy below makes that legible, and the amber strip catches
   the one case where a user might still get it wrong. */
export default function PropertyInvestments({
  plan, setField, findingsFor, makeId, simulation,
}) {
  const properties = plan.properties ?? [];
  const age = effectiveAge(plan);

  const appreciation = plan.bucketOverrides?.property?.annualReturn
    ?? BUCKET_DEFS.property.defaultReturn;

  const totalValue = properties.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const totalDebt = properties.reduce((s, p) => s + (Number(p.loanOutstanding) || 0), 0);
  const monthlyRent = properties.reduce((s, p) => s + (Number(p.rentalIncome) || 0), 0);

  /* Named so the warning can point at the actual goal rather than at a category. */
  const futureHome = (plan.goals ?? []).find((g) => g.emoji === "home" && Number(g.age) > age);

  const update = (id, key, val) =>
    setField("properties", properties.map((p) => (p.id === id ? { ...p, [key]: val } : p)));
  const remove = (id) => setField("properties", properties.filter((p) => p.id !== id));
  const add = () => setField("properties", [...properties, {
    id: makeId(), name: "", value: 5000000, rentalIncome: 0, maintenancePct: 1,
    loanOutstanding: 0, loanRate: 8.5, loanRemainingYears: 0,
  }]);

  return (
    <CollapsibleSection title="Property You Own" defaultOpen={false}
      badge={totalValue > 0 ? fmt(totalValue) : null}>

      <InfoStrip tone="blue">
        <strong>Property you already own.</strong> A home you plan to buy belongs in
        Goals — it is already in your projection there, and entering it here too
        would count it twice.
      </InfoStrip>

      {properties.map((p) => {
        const hasLoan = (Number(p.loanOutstanding) || 0) > 0;
        return (
          <ItemCard key={p.id}>
            <div className="flex items-center justify-between gap-2">
              <input type="text" value={p.name ?? ""} placeholder="Name this property"
                onChange={(e) => update(p.id, "name", e.target.value)}
                className="text-xs font-bold bg-transparent outline-none flex-1 min-w-0"
                style={{ color: 'var(--text-primary)' }} />
              <span className="text-[0.6rem] font-bold shrink-0"
                style={{ color: 'var(--financial-projection)' }}>
                {fmt((Number(p.value) || 0) - (Number(p.loanOutstanding) || 0))} equity
              </span>
              <button onClick={() => remove(p.id)} className="hover:text-rose-400 shrink-0"
                style={{ color: 'var(--text-muted)' }}><X size={ICON_SIZE.xs} /></button>
            </div>

            <SliderInput label="Market value today (₹)" value={p.value ?? 0}
              onChange={(v) => update(p.id, "value", v)}
              min={0} max={200000000} step={100000} prefix="₹" showWords />

            <SliderInput label="Rental income (₹/month, after tax)" value={p.rentalIncome ?? 0}
              onChange={(v) => update(p.id, "rentalIncome", v)}
              min={0} max={1000000} step={1000} prefix="₹" />
            <p className="text-[0.55rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              What you keep. Rent is taxed at slab rates after a 30% standard
              deduction, and this projection has no tax model — so enter the net figure.
            </p>

            <SliderInput label="Annual maintenance" value={p.maintenancePct ?? 0}
              onChange={(v) => update(p.id, "maintenancePct", v)}
              min={0} max={5} step={0.1} suffix="%" />
            <p className="text-[0.55rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Of current value — repairs, society dues, property tax. Charged for life,
              so it makes financial independence harder, not easier.
            </p>

            <SliderInput label="Loan outstanding today (₹)" value={p.loanOutstanding ?? 0}
              onChange={(v) => update(p.id, "loanOutstanding", v)}
              min={0} max={100000000} step={100000} prefix="₹" showWords />
            <p className="text-[0.55rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              The balance left now, not the original loan amount.
            </p>

            {hasLoan && (
              <>
                <SliderInput label="Years left on the loan" value={p.loanRemainingYears ?? 0}
                  onChange={(v) => update(p.id, "loanRemainingYears", v)}
                  min={0} max={30} step={1} suffix=" yrs" />
                <SliderInput label="Interest rate" value={p.loanRate ?? 8.5}
                  onChange={(v) => update(p.id, "loanRate", v)}
                  min={0} max={20} step={0.1} suffix="%" />
                {(Number(p.loanRemainingYears) || 0) === 0 && (
                  <InfoStrip tone="red">
                    Set the years left, or this loan is treated as already repaid.
                  </InfoStrip>
                )}
              </>
            )}
          </ItemCard>
        );
      })}

      <AddItemButton onClick={add} label="Add Property" tone="violet" />

      {properties.length > 0 && futureHome && (
        <InfoStrip tone="amber">
          You have a <strong>{futureHome.name || "home"}</strong> goal at age{" "}
          {futureHome.age} and a property listed here. If they are the same home,
          remove one — the goal already charges its down payment, EMI and maintenance.
        </InfoStrip>
      )}

      {properties.length > 0 && (
        <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-secondary)' }}>
          <DerivedStat label="Total property value" value={fmt(totalValue)} />
          {totalDebt > 0 && (
            <DerivedStat label="Less loans outstanding" value={`−${fmt(totalDebt)}`} tone="muted" />
          )}
          <DerivedStat label="Net property equity" value={fmt(totalValue - totalDebt)} />
          {monthlyRent > 0 && (
            <DerivedStat label="Rental income" value={`${fmt(monthlyRent)}/mo`}
              sub={`${fmt(monthlyRent * 12)}/yr, after tax`} tone="muted" />
          )}
        </div>
      )}

      <InfoStrip tone="amber">
        Counted in your net worth, but never sold to cover a shortfall — a home you
        live in cannot fund retirement spending. For the same reason it does not
        bring your financial independence age forward. Property is assumed to
        appreciate at <strong>{appreciation}%</strong> a year.
      </InfoStrip>
    </CollapsibleSection>
  );
}
