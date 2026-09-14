"use client";

import { X, Plus } from "lucide-react";
import { CollapsibleSection, SliderInput, ToggleSwitch, FieldError } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { calcEMI } from "@/lib/finance/loans.mjs";
import { GOAL_EMOJIS, goalEmoji } from "@/lib/profile/goalTypes.mjs";

export default function FinancialGoals({ plan, goals, addGoal, removeGoal, updateGoal, findingsFor, age, lifeExpectancy, defaultOpen }) {
  const { exitTaxRate, currentAge } = plan;

  return (
    <CollapsibleSection title="Financial Goals" badge={`${goals.length}`} defaultOpen={defaultOpen}>
      {goals.map((g) => {
        const isHome = g.emoji === "home";
        const loanAmt = g.hasLoan ? g.amount * (1 - g.downPaymentPct / 100) : 0;
        const emi = g.hasLoan ? calcEMI(loanAmt, g.loanRate, g.loanTenure) : 0;
        return (
          <div key={g.id} className="rounded-lg p-4 space-y-3"
            style={{ background: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{goalEmoji(g.emoji)}</span>
                <input type="text" value={g.name} onChange={(e) => updateGoal(g.id, "name", e.target.value)}
                  className="text-xs font-bold bg-transparent outline-none w-28" style={{ color: 'var(--text-primary)' }} />
              </div>
              <button onClick={() => removeGoal(g.id)} className="hover:text-rose-400" style={{ color: 'var(--text-muted)' }}><X size={12} /></button>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(GOAL_EMOJIS).map(([k, v]) => (
                  <button key={k} onClick={() => updateGoal(g.id, "emoji", k)}
                    className="h-8 w-8 rounded-lg text-sm flex items-center justify-center transition"
                    style={g.emoji === k ? { background: 'var(--bg-secondary)', outline: '1px solid var(--accent)' } : { background: 'var(--bg-tertiary)' }}>{v}</button>
                ))}
              </div>
            </div>

            <SliderInput label="Target Age" value={g.age} onChange={(v) => updateGoal(g.id, "age", v)} min={currentAge} max={lifeExpectancy} suffix=" yrs" />
            <SliderInput label="Total Cost" value={g.amount} onChange={(v) => updateGoal(g.id, "amount", v)} min={100000} max={100000000} step={100000} prefix="₹" showWords />

            <div className="mt-5">
              <ToggleSwitch value={g.hasLoan} onChange={(v) => updateGoal(g.id, "hasLoan", v)} label="Finance via Loan" />
            </div>

            {g.hasLoan && (
              <div className="space-y-3 pl-4 border-l-2"
                style={{ borderColor: 'var(--info-rose-border)' }}>
                <SliderInput label="Down Payment %" value={g.downPaymentPct} onChange={(v) => updateGoal(g.id, "downPaymentPct", v)} min={5} max={80} step={5} suffix="%" />
                <SliderInput label="Loan Interest Rate" value={g.loanRate} onChange={(v) => updateGoal(g.id, "loanRate", v)} min={5} max={15} step={0.25} suffix="%" />
                <SliderInput label="Loan Tenure" value={g.loanTenure} onChange={(v) => updateGoal(g.id, "loanTenure", v)} min={1} max={30} suffix=" yrs" />
                <div className="text-xs space-y-0.5" style={{ color: 'var(--info-rose-text)' }}>
                  <div>Loan: {fmt(loanAmt)} · EMI: {fmt(emi)}/mo</div>
                  <div>Down payment (gross of tax): {fmt((g.amount * g.downPaymentPct / 100) / (1 - exitTaxRate / 100))}</div>
                </div>
              </div>
            )}

            {!g.hasLoan && (
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Gross withdrawal (incl. {exitTaxRate}% tax): <strong style={{ color: 'var(--text-primary)' }}>{fmt(g.amount / (1 - exitTaxRate / 100))}</strong>
              </div>
            )}

            {isHome && (
              <div className="mt-5 space-y-3">
                <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--financial-target)' }}>Home-Specific</div>
                <SliderInput label="Property Appreciation" value={g.appreciationRate} onChange={(v) => updateGoal(g.id, "appreciationRate", v)} min={0} max={15} step={0.5} suffix="%" />
                <SliderInput label="Annual Maintenance %" value={g.maintenancePct} onChange={(v) => updateGoal(g.id, "maintenancePct", v)} min={0} max={5} step={0.25} suffix="%" />
              </div>
            )}
          </div>
        );
      })}
      <button onClick={addGoal} className="w-full rounded-lg border border-dashed py-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
        style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}>
        <Plus size={13} /> Add Goal
      </button>
    </CollapsibleSection>
  );
}
