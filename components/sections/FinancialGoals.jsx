"use client";

import { useState } from "react";
import { Pencil, Trash2, ArrowRight, Target } from "lucide-react";
import {
  CollapsibleSection, SliderInput, ToggleSwitch, FieldError, DerivedStat, AddItemButton, Button, Label,
} from "@/components/ui";
import { fmt, CURRENT_YEAR } from "@/lib/finance/format.mjs";
import { calcEMI } from "@/lib/finance/loans.mjs";
import { goalInflationRate, goalFutureCost } from "@/lib/finance/projection.mjs";
import {
  GOAL_TYPES, goalLabel, goalShortLabel, goalNameForType, historicalInflation,
} from "@/lib/profile/goalTypes.mjs";
import GoalIcon from "@/components/ui/GoalIcon";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Goals, client items 12–20.

   One way in: Add Goal → choose a type → fill in the details → Save. Saved
   goals then sit as one compact row each; Edit reopens the same editor on that
   goal. The editor works on a local draft and commits the whole goal on Save,
   so a half-filled goal never reaches the projection and Cancel really
   cancels.

   Every goal carries its own expected inflation. The rows and the editor show
   both prices: today's cost as entered, and the future cost at the target age
   (today's cost × (1 + rate)^years). */

/* A brand-new goal of `type`, opening a few years out. Its inflation starts at
   general inflation (a home at the 5% the seeded home goal always used) — a
   starting point the user edits, never a figure presented as data. */
function blankGoal(type, plan, age) {
  const isHome = type === "home";
  return {
    id: null,
    name: goalLabel(type),
    emoji: type,
    age: age + 5,
    amount: isHome ? 8000000 : 1000000,
    inflationRate: isHome ? 5 : Number(plan.inflationRate) || 0,
    hasLoan: false, downPaymentPct: isHome ? 20 : 100, loanRate: isHome ? 8.5 : 9, loanTenure: isHome ? 20 : 5,
    appreciationRate: isHome ? 5 : 0, maintenancePct: isHome ? 1 : 0,
  };
}

export default function FinancialGoals({ plan, goals, saveGoal, removeGoal, findingsFor, age, lifeExpectancy, defaultOpen }) {
  /* null, or { step: "type" | "details", draft } — draft.id null when new. */
  const [editing, setEditing] = useState(null);

  const startAdd = () => setEditing({ step: "type", draft: null });
  const startEdit = (g) => setEditing({ step: "details", draft: { ...g } });
  const close = () => setEditing(null);

  const editingId = editing?.draft?.id ?? null;
  const addingNew = !!editing && editingId === null;

  return (
    <CollapsibleSection title="Financial Goals" icon={Target} badge={`${goals.length}`} defaultOpen={defaultOpen}>
      {goals.length === 0 && !editing && (
        <p className="text-help text-[var(--text-muted)]">
          No goals yet. Add a home, education, car or anything else you are saving for.
        </p>
      )}

      {goals.map((g, i) => (editingId === g.id ? (
        <GoalEditor key={g.id} editing={editing} setEditing={setEditing} plan={plan} age={age}
          lifeExpectancy={lifeExpectancy} onSave={(d) => { saveGoal(d); close(); }} onCancel={close} />
      ) : (
        <SavedGoal key={g.id} goal={g} plan={plan} age={age}
          findings={findingsFor(`goals.${i}`)}
          onEdit={() => startEdit(g)} onRemove={() => removeGoal(g.id)} disabled={!!editing} />
      )))}

      {addingNew ? (
        <GoalEditor editing={editing} setEditing={setEditing} plan={plan} age={age}
          lifeExpectancy={lifeExpectancy} onSave={(d) => { saveGoal(d); close(); }} onCancel={close} />
      ) : (
        !editing && <AddItemButton onClick={startAdd} label="Add Goal" />
      )}
    </CollapsibleSection>
  );
}

/* One saved goal: what it is, when, and both prices. */
function SavedGoal({ goal, plan, age, findings, onEdit, onRemove, disabled }) {
  const years = Math.max(0, goal.age - age);
  const future = goalFutureCost(plan, goal, age);
  const rate = goalInflationRate(plan, goal);

  return (
    <div className="rounded-xl border p-4 space-y-2 border-[var(--border-default)] bg-[var(--surface-raised)] transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          <GoalIcon type={goal.emoji} size={ICON_SIZE.md} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-subtitle text-[var(--text-primary)]">{goal.name}</div>
          <div className="text-help text-[var(--text-muted)]">
            Age {goal.age} · {years > 0 ? `in ${years} yr${years === 1 ? "" : "s"}` : "not in the future"}
            {goal.hasLoan && " · financed"}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled}
          aria-label={`Edit ${goal.name}`} className="h-8 w-8">
          <Pencil size={ICON_SIZE.sm} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={disabled}
          aria-label={`Remove ${goal.name}`} className="h-8 w-8">
          <Trash2 size={ICON_SIZE.sm} />
        </Button>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pl-[2.875rem] text-help">
        <span className="text-[var(--text-secondary)]">Today <strong className="text-value-sm tabular-nums text-[var(--text-primary)]">{fmt(goal.amount)}</strong></span>
        <ArrowRight size={ICON_SIZE.xs} className="self-center text-[var(--text-subtle)]" />
        <span className="text-[var(--text-secondary)]">Future <strong className="text-value-sm tabular-nums text-[var(--text-primary)]">{fmt(future)}</strong></span>
        <span className="text-[var(--text-muted)]">at {rate}%/yr</span>
      </div>
      <FieldError findings={findings} />
    </div>
  );
}

/* The one editor, for adding and for editing. */
function GoalEditor({ editing, setEditing, plan, age, lifeExpectancy, onSave, onCancel }) {
  const { step, draft } = editing;
  const isNew = draft === null || draft.id === null;

  if (step === "type") {
    const pick = (type) => {
      const next = draft
        ? { ...draft, emoji: type, name: goalNameForType(draft.name, type) }
        : blankGoal(type, plan, age);
      setEditing({ step: "details", draft: next });
    };
    return (
      <EditorFrame title={isNew ? "Add a goal" : "Change goal type"} subtitle="What are you saving for?">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GOAL_TYPES.map((t) => {
            const selected = draft?.emoji === t;
            return (
              <button key={t} type="button" onClick={() => pick(t)} aria-pressed={selected}
                className="flex flex-col items-center gap-2 rounded-xl border px-2 py-4 text-label font-semibold transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                style={selected
                  ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" }
                  : { color: "var(--text-secondary)", borderColor: "var(--border-default)" }}>
                <GoalIcon type={t} size={ICON_SIZE.md} />
                {goalShortLabel(t)}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={draft ? () => setEditing({ step: "details", draft }) : onCancel}>
            {draft ? "Back" : "Cancel"}
          </Button>
        </div>
      </EditorFrame>
    );
  }

  const set = (key, val) => setEditing({ step, draft: { ...draft, [key]: val } });
  const minAge = age + 1;
  const years = draft.age - age;
  const ageOk = draft.age > age;
  const rate = goalInflationRate(plan, draft);
  const future = goalFutureCost(plan, draft, age);
  const historical = historicalInflation(draft.emoji);
  const isHome = draft.emoji === "home";
  const loanAmt = draft.hasLoan ? draft.amount * (1 - draft.downPaymentPct / 100) : 0;
  const emi = draft.hasLoan ? calcEMI(loanAmt, draft.loanRate, draft.loanTenure) : 0;
  const nameOk = String(draft.name ?? "").trim() !== "";
  const canSave = ageOk && nameOk && draft.amount > 0;

  return (
    <EditorFrame
      title={isNew ? "Add a goal" : "Edit goal"}
      icon={draft.emoji}
      action={
        <Button variant="link" size="sm" className="h-auto p-0"
          onClick={() => setEditing({ step: "type", draft })}>
          Change type
        </Button>
      }>
      <div className="space-y-2">
        <Label htmlFor="goal-name">Goal name</Label>
        <input id="goal-name" type="text" value={draft.name} onChange={(e) => set("name", e.target.value)}
          className="h-[var(--control-md)] w-full rounded-[10px] border px-4 text-base shadow-[var(--shadow-xs)] outline-none transition-all hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)] focus:[box-shadow:var(--input-focus-ring)]"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }} />
      </div>

      <div className="space-y-1">
        <SliderInput label="Target age" value={draft.age}
          onChange={(v) => set("age", v)} min={minAge} max={lifeExpectancy} suffix=" yrs" warn={!ageOk} />
        {!ageOk && (
          <p className="text-help text-[var(--danger)]">
            Target age must be after your current age ({age}). Choose {minAge} or later.
          </p>
        )}
      </div>

      <SliderInput label="Today's cost" value={draft.amount} onChange={(v) => set("amount", v)}
        min={100000} max={100000000} step={100000} prefix="₹" showWords />

      <div className="space-y-1">
        <SliderInput label="Expected inflation" value={rate} onChange={(v) => set("inflationRate", v)}
          min={0} max={20} step={0.5} suffix="%" />
        <p className="text-help text-[var(--text-muted)]">
          {historical !== null
            ? <>Historical average: <strong>{historical}%</strong>. A guide only; set your own.</>
            : <>How fast this price rises each year. General inflation is {plan.inflationRate}%.</>}
        </p>
      </div>

      <div className="rounded-lg p-3 space-y-2 bg-[var(--surface-muted)]">
        <DerivedStat label="Years to goal" value={ageOk ? `${years} yr${years === 1 ? "" : "s"}` : "—"}
          sub={ageOk ? `${CURRENT_YEAR + years}` : null} />
        <DerivedStat label="Future cost" value={ageOk ? fmt(future) : "—"}
          sub={ageOk ? `${fmt(draft.amount)} today at ${rate}%/yr` : null} />
      </div>

      <ToggleSwitch value={draft.hasLoan} onChange={(v) => set("hasLoan", v)} label="Finance via loan" />
      {draft.hasLoan && (
        <div className="space-y-5 border-l-2 pl-4" style={{ borderColor: "var(--border-strong)" }}>
          <SliderInput label="Down payment %" value={draft.downPaymentPct} onChange={(v) => set("downPaymentPct", v)} min={5} max={80} step={5} suffix="%" />
          <SliderInput label="Loan interest rate" value={draft.loanRate} onChange={(v) => set("loanRate", v)} min={5} max={15} step={0.25} suffix="%" />
          <SliderInput label="Loan tenure" value={draft.loanTenure} onChange={(v) => set("loanTenure", v)} min={1} max={30} suffix=" yrs" />
          <div className="text-help tabular-nums" style={{ color: "var(--text-secondary)" }}>
            Loan <strong className="text-value-sm text-[var(--text-primary)]">{fmt(loanAmt)}</strong> · EMI <strong className="text-value-sm text-[var(--text-primary)]">{fmt(emi)}</strong>/mo, in today&rsquo;s rupees
          </div>
        </div>
      )}

      {isHome && (
        <div className="space-y-3">
          <div className="text-overline uppercase" style={{ color: "var(--gold-text)" }}>After you buy</div>
          <SliderInput label="Property appreciation" value={draft.appreciationRate} onChange={(v) => set("appreciationRate", v)} min={0} max={15} step={0.5} suffix="%" />
          <SliderInput label="Annual maintenance %" value={draft.maintenancePct} onChange={(v) => set("maintenancePct", v)} min={0} max={5} step={0.25} suffix="%" />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(draft)} disabled={!canSave}>Save goal</Button>
      </div>
      {!nameOk && <p className="text-right text-help text-[var(--danger)]">Give the goal a name.</p>}
    </EditorFrame>
  );
}

function EditorFrame({ title, subtitle = null, icon = null, action = null, children }) {
  return (
    <div className="rounded-lg border-2 p-4 space-y-4 border-[var(--accent)] bg-[var(--surface-raised)]">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            <GoalIcon type={icon} size={ICON_SIZE.md} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-subtitle text-[var(--text-primary)]">{title}</div>
          {subtitle && <div className="text-help text-[var(--text-muted)]">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
