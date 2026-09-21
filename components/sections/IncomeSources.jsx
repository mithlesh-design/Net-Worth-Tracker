"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { CollapsibleSection, SliderInput, SegmentedControl, DerivedStat, FieldError, InfoStrip } from "@/components/ui";
import { fmt, toAnnual } from "@/lib/finance/format.mjs";
import { effectiveAge } from "@/lib/finance/age.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Renders one person's income list — yours, or a household member's.
   Parameterised rather than duplicated: after the gross/take-home control went
   away the only things that differ are the section title, the findings path
   prefix and whether the last row can be deleted. A copy would drift — see the TOTAL_STEPS note in
   wizardSteps.js for what that costs here. */
export default function IncomeSources({
  plan, incomes, updateIncome, addIncome, removeIncome, findingsFor,
  totalMonthlyIncome, defaultOpen,
  title = "Income Sources",
  pathPrefix = "incomes",
  /* Your list must keep at least one row; a member's may be emptied. */
  minItems = 1,
  showHint = true,
}) {
  const { currentAge } = plan;
  const age = effectiveAge(plan);

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newInc, setNewInc] = useState({ name: "Bonus", amount: 300000, frequency: "yearly", role: "other", growthRate: 5, retireAge: 55 });

  const handleAdd = () => {
    addIncome(newInc);
    setShowAddIncome(false);
    setNewInc({ name: "Bonus", amount: 300000, frequency: "yearly", role: "other", growthRate: 5, retireAge: 55 });
  };

  return (
    <CollapsibleSection title={title} badge={`${incomes.length}`} defaultOpen={defaultOpen}>
      {showHint && (
        <InfoStrip tone="blue">
          Enter <strong>take-home</strong> pay — what actually reaches the bank, after
          tax and EPF. Growth applies to that figure, so the effective tax rate is
          held constant for the whole projection.
        </InfoStrip>
      )}
      {incomes.map((inc) => (
        <div key={inc.id} className="rounded-lg p-4 space-y-3"
          style={{ background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center justify-between">
            <input type="text" value={inc.name} onChange={(e) => updateIncome(inc.id, "name", e.target.value)}
              className="text-xs font-bold bg-transparent outline-none w-28" style={{ color: 'var(--text-primary)' }} />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold" style={{ color: 'var(--financial-projection)' }}>{fmt(toAnnual(inc.amount, inc.frequency))}/yr</span>
              {incomes.length > minItems && <button onClick={() => removeIncome(inc.id)} className="hover:text-rose-400" style={{ color: 'var(--text-muted)' }}><X size={ICON_SIZE.xs} /></button>}
            </div>
          </div>
          <SliderInput label={`Amount (${inc.frequency})`} value={inc.amount} onChange={(v) => updateIncome(inc.id, "amount", v)}
            min={0} max={inc.frequency === "yearly" ? 10000000 : inc.frequency === "quarterly" ? 2500000 : 1000000} step={5000} prefix="₹" showWords />
          <SegmentedControl
            label="Frequency"
            options={["monthly", "quarterly", "yearly"]}
            value={inc.frequency}
            onChange={(v) => updateIncome(inc.id, "frequency", v)}
          />
          <SliderInput
            label={inc.role === "salary" ? "Average Salary Growth (annual)" : "Annual Growth"}
            value={inc.growthRate} onChange={(v) => updateIncome(inc.id, "growthRate", v)}
            min={0} max={25} step={0.5} suffix="%" />
          <SliderInput label="Retire Age" value={inc.retireAge} onChange={(v) => updateIncome(inc.id, "retireAge", v)} min={age} max={75} suffix=" yrs" />
          <FieldError findings={findingsFor(`${pathPrefix}.${incomes.indexOf(inc)}`)} />
        </div>
      ))}
      {showAddIncome ? (
        <div className="rounded-lg p-4 space-y-3"
          style={{ background: 'var(--bg-tertiary)' }}>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>New Income</div>
          <input type="text" value={newInc.name} onChange={(e) => setNewInc({ ...newInc, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--input-text)' }}
            placeholder="Name" />
          <SliderInput label="Amount" value={newInc.amount} onChange={(v) => setNewInc({ ...newInc, amount: v })}
            min={0} max={newInc.frequency === "yearly" ? 10000000 : 1000000} step={5000} prefix="₹" showWords />
          <SegmentedControl
            label="Frequency"
            options={["monthly", "quarterly", "yearly"]}
            value={newInc.frequency}
            onChange={(v) => setNewInc({ ...newInc, frequency: v })}
          />
          <SliderInput label="Growth %" value={newInc.growthRate} onChange={(v) => setNewInc({ ...newInc, growthRate: v })} min={0} max={25} step={0.5} suffix="%" />
          <SliderInput label="Retire Age" value={newInc.retireAge} onChange={(v) => setNewInc({ ...newInc, retireAge: v })} min={currentAge} max={75} suffix=" yrs" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 rounded-lg py-1.5 text-xs font-bold transition"
              style={{ background: 'var(--button-primary-bg)', color: 'var(--button-primary-text)' }}>Add</button>
            <button onClick={() => setShowAddIncome(false)} className="rounded-lg border px-3 py-1.5 text-xs transition"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddIncome(true)} className="w-full rounded-lg border border-dashed py-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
          <Plus size={ICON_SIZE.sm} /> Add Income Source
        </button>
      )}
      <div className="mt-5 space-y-2">
        <DerivedStat label="Total Monthly Income" value={`${fmt(totalMonthlyIncome)}/mo`} />
        <DerivedStat label="Total Annual Income" value={fmt(totalMonthlyIncome * 12)}
          sub="take-home" tone="muted" />
      </div>
    </CollapsibleSection>
  );
}
