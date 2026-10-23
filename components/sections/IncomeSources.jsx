"use client";

import { useState } from "react";
import { X, Wallet } from "lucide-react";
import { CollapsibleSection, SliderInput, SegmentedControl, DerivedStat, FieldError, InfoStrip, Button, AddItemButton } from "@/components/ui";
import { fmt, toAnnual } from "@/lib/finance/format.mjs";
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
  /* Where this person's retirement age is set: yours on About You, a member's
     on their card. Incomes only read it — it is never asked here. */
  retirementAgeSource = "About You",
  pathPrefix = "incomes",
  /* Your list must keep at least one row; a member's may be emptied. */
  minItems = 1,
  showHint = true,
}) {
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newInc, setNewInc] = useState({ name: "Bonus", amount: 300000, frequency: "yearly", role: "other", growthRate: 5 });

  const handleAdd = () => {
    addIncome(newInc);
    setShowAddIncome(false);
    setNewInc({ name: "Bonus", amount: 300000, frequency: "yearly", role: "other", growthRate: 5 });
  };

  return (
    <CollapsibleSection title={title} icon={Wallet} badge={`${incomes.length}`} defaultOpen={defaultOpen}>
      {showHint && (
        <InfoStrip tone="blue">
          Enter <strong>take-home</strong> pay — what actually reaches the bank, after
          tax and EPF. Growth applies to that figure, so the effective tax rate is
          held constant for the whole projection.
        </InfoStrip>
      )}
      {incomes.map((inc) => (
        <div key={inc.id} className="space-y-5 rounded-xl border border-[var(--border-subtle)] p-4 sm:p-5"
          style={{ background: 'var(--bg-tertiary)' }}>
          <div className="flex items-baseline justify-between gap-3">
            <input type="text" value={inc.name} onChange={(e) => updateIncome(inc.id, "name", e.target.value)}
              aria-label="Income name" className="-mx-1 min-w-0 flex-1 rounded-md bg-transparent px-1 text-subtitle outline-none transition-colors hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)] focus:ring-2 focus:ring-[var(--gold-line)]" style={{ color: 'var(--text-primary)' }} />
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-value-sm tabular-nums" style={{ color: 'var(--financial-projection)' }}>{fmt(toAnnual(inc.amount, inc.frequency))}/yr</span>
              {incomes.length > minItems && <button onClick={() => removeIncome(inc.id)} aria-label={`Remove ${inc.name || "income"}`} className="hover:text-[var(--danger)]" style={{ color: 'var(--text-muted)' }}><X size={ICON_SIZE.xs} /></button>}
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
          <FieldError findings={findingsFor(`${pathPrefix}.${incomes.indexOf(inc)}`)} />
        </div>
      ))}
      {showAddIncome ? (
        <div className="space-y-5 rounded-xl border border-[var(--border-subtle)] p-4 sm:p-5"
          style={{ background: 'var(--bg-tertiary)' }}>
          <div className="text-overline uppercase" style={{ color: 'var(--text-muted)' }}>New Income</div>
          <input type="text" value={newInc.name} onChange={(e) => setNewInc({ ...newInc, name: e.target.value })}
            className="h-[var(--control-md)] w-full rounded-[10px] border px-4 text-base font-medium shadow-[var(--shadow-xs)] outline-none transition-all placeholder:font-normal placeholder:text-[var(--input-placeholder)] hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)] focus:[box-shadow:var(--input-focus-ring)]"
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
          <div className="flex gap-2">
            <Button onClick={handleAdd} className="flex-1">Add</Button>
            <Button variant="outline" onClick={() => setShowAddIncome(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <AddItemButton onClick={() => setShowAddIncome(true)} label="Add Income Source" />
      )}
      <p className="text-help" style={{ color: 'var(--text-muted)' }}>
        All income stops at retirement age, <strong style={{ color: 'var(--text-primary)' }}>{plan.retirementAge} yrs</strong>.
        Change it on {retirementAgeSource}.
      </p>
      <div className="mt-5 space-y-2">
        <DerivedStat label="Total Monthly Income" value={`${fmt(totalMonthlyIncome)}/mo`} />
        <DerivedStat label="Total Annual Income" value={fmt(totalMonthlyIncome * 12)}
          sub="take-home" tone="muted" />
      </div>
    </CollapsibleSection>
  );
}
