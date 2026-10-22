"use client";

import { Trash2, ShieldCheck } from "lucide-react";
import {
  CollapsibleSection, SliderInput, SegmentedControl, ToggleSwitch, InfoStrip, FieldError,
  ItemCard, AddItemButton, Button, Label,
} from "@/components/ui";
import { fmt, CURRENT_YEAR } from "@/lib/finance/format.mjs";
import { effectiveAge } from "@/lib/finance/age.mjs";
import {
  POLICY_TYPES, POLICY_TYPE_LABELS, newPolicy, annualPolicyPremium, maturityAmount,
  paysMaturity, paysIncome, premiumYears, policyLabel,
} from "@/lib/finance/lifePolicies.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

const FREQUENCIES = ["monthly", "quarterly", "yearly"];
const MAX_AGE = 100;

/* Client items 6–11. A list of policies, each carrying its own premium and
   whatever it pays back. lib/finance/lifePolicies.mjs owns the arithmetic;
   this only asks for the fields a type uses. Every field stays on the policy
   whatever the type, so switching type and back loses nothing. */
export default function LifeInsurance({ plan, setField, findingsFor, makeId }) {
  const policies = Array.isArray(plan.lifePolicies) ? plan.lifePolicies : [];
  const age = effectiveAge(plan);
  const totalPremium = policies.reduce((t, p) => t + annualPolicyPremium(p), 0);

  const add = () => setField("lifePolicies", [
    ...policies, newPolicy(makeId(), { age, retirementAge: plan.retirementAge }),
  ]);
  const remove = (id) => setField("lifePolicies", policies.filter((p) => p.id !== id));

  return (
    <CollapsibleSection title="Life Insurance" icon={ShieldCheck} defaultOpen={false}
      badge={policies.length ? `${policies.length} · ${fmt(totalPremium / 12)}/mo` : "None"}>
      {policies.map((p, i) => (
        <PolicyCard key={p.id} policy={p} index={i} age={age} setField={setField}
          findings={findingsFor(`lifePolicies.${i}`)} onRemove={() => remove(p.id)} />
      ))}

      <AddItemButton onClick={add} label={policies.length ? "Add another policy" : "Add a life insurance policy"} />

      <InfoStrip tone="blue">
        The sum assured is paid to your nominee on death. It is protection, not wealth, so it
        is never counted as money in your plan. What a policy pays you while you are alive
        (annual income, maturity) is added to the plan in the year it is paid.
      </InfoStrip>
    </CollapsibleSection>
  );
}

function PolicyCard({ policy: p, index, age, setField, findings, onRemove }) {
  const base = `lifePolicies.${index}`;
  const set = (key, v) => setField(`${base}.${key}`, v);
  /* Editing a moved policy is the review the migration asked for; once the
     user touches it, stop asking. */
  const edit = (key, v) => {
    set(key, v);
    if (p.needsReview) set("needsReview", false);
  };

  return (
    <ItemCard>
      <div className="flex items-center gap-2">
        <input type="text" value={p.name ?? ""} placeholder={POLICY_TYPE_LABELS[p.type] ?? "Policy name"}
          onChange={(e) => edit("name", e.target.value)} aria-label="Policy name"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}
          aria-label={`Remove ${policyLabel(p)}`}>
          <Trash2 size={ICON_SIZE.sm} />
        </Button>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${base}-type`}>Policy type</Label>
        <select id={`${base}-type`} value={p.type} onChange={(e) => edit("type", e.target.value)}
className="h-[var(--control-md)] w-full rounded-[10px] border px-4 text-base shadow-[var(--shadow-xs)] outline-none transition-all hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)] focus:[box-shadow:var(--input-focus-ring)]"
          style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", color: "var(--input-text)" }}>
          {POLICY_TYPES.map((t) => <option key={t} value={t}>{POLICY_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      <SliderInput label="Total sum assured (₹)" value={p.sumAssured ?? 0} onChange={(v) => edit("sumAssured", v)}
        min={0} max={100000000} step={100000} prefix="₹" showWords />

      {/* ── Premium ── */}
      <div className="border-t pt-3 space-y-3 border-[var(--border-subtle)]">
        <SliderInput label="Premium (₹)" value={p.premium ?? 0} onChange={(v) => edit("premium", v)}
          min={0} max={500000} step={500} prefix="₹" />
        <SegmentedControl label="Premium frequency" options={FREQUENCIES}
          value={p.premiumFrequency} onChange={(v) => edit("premiumFrequency", v)} />
        <SliderInput label="Pay premium until age" value={p.premiumUntilAge}
          onChange={(v) => edit("premiumUntilAge", v)} min={age} max={MAX_AGE} suffix=" yrs" />
      </div>

      {/* ── By type ── */}
      <div className="border-t pt-3 space-y-3 border-[var(--border-subtle)]">
        {p.type === "term" && <TermFields p={p} age={age} edit={edit} />}
        {(p.type === "endowment" || p.type === "ulip") && <MaturityFields p={p} age={age} edit={edit} />}
      </div>

      <PolicySummary p={p} age={age} />
      <FieldError findings={findings} />
    </ItemCard>
  );
}

function TermFields({ p, age, edit }) {
  return (
    <>
      <SegmentedControl label="Return type" wrap
        options={[
          { value: "none", label: "Without return of premium" },
          { value: "rop", label: "Return of premium" },
        ]}
        value={p.returnOfPremium ? "rop" : "none"}
        onChange={(v) => edit("returnOfPremium", v === "rop")} />
      {p.returnOfPremium && (
        <>
          <SliderInput label="Return / maturity age" value={p.maturityAge}
            onChange={(v) => edit("maturityAge", v)} min={age} max={MAX_AGE} suffix=" yrs" />
          <SliderInput label="Age you started the policy" value={p.startAge}
            onChange={(v) => edit("startAge", v)} min={18} max={Math.max(18, p.premiumUntilAge)} suffix=" yrs" />
          <p className="text-xs text-[var(--text-muted)]">
            Used to count the premiums returned: {premiumYears(p)} years × {fmt(annualPolicyPremium(p))} a year.
          </p>
        </>
      )}
    </>
  );
}

function MaturityFields({ p, age, edit }) {
  const isUlip = p.type === "ulip";
  const payments = Math.max(0, (p.incomeEndAge ?? 0) - (p.incomeStartAge ?? 0) + 1);
  return (
    <>
      <SliderInput label="Maturity age" value={p.maturityAge}
        onChange={(v) => edit("maturityAge", v)} min={age} max={MAX_AGE} suffix=" yrs" />
      <SliderInput label="Approximate maturity amount (₹)" value={p.maturityAmount ?? 0}
        onChange={(v) => edit("maturityAmount", v)} min={0} max={100000000} step={50000} prefix="₹" showWords />
      {isUlip && (
        <p className="text-xs text-[var(--text-muted)]">
          A ULIP&rsquo;s value depends on the market. Use the projected figure from your policy
          statement; the plan treats it as an estimate.
        </p>
      )}

      <ToggleSwitch value={!!p.hasIncome} onChange={(v) => edit("hasIncome", v)}
        label="Pays an annual income before maturity" />
      {p.hasIncome && (
        <div className="space-y-3 pl-4 border-l-2 border-[var(--border-default)]">
          <SliderInput label="Annual income amount (₹)" value={p.annualIncome ?? 0}
            onChange={(v) => edit("annualIncome", v)} min={0} max={10000000} step={10000} prefix="₹" showWords />
          <SliderInput label={isUlip ? "Return start age" : "Income start age"} value={p.incomeStartAge}
            onChange={(v) => edit("incomeStartAge", v)} min={age} max={MAX_AGE} suffix=" yrs" />
          <SliderInput label="Income end age" value={p.incomeEndAge}
            onChange={(v) => edit("incomeEndAge", v)} min={p.incomeStartAge ?? age} max={MAX_AGE} suffix=" yrs" />
          <p className="text-xs text-[var(--text-muted)]">
            {payments > 0
              ? `${payments} yearly payment${payments === 1 ? "" : "s"}, from age ${p.incomeStartAge} to ${p.incomeEndAge}.`
              : "The end age must be the start age or later."}
          </p>
        </div>
      )}
    </>
  );
}

/* Plain words for what the policy costs and pays, with the calendar year, so
   "when will the return be received" is answered on the card itself. */
function PolicySummary({ p, age }) {
  const yearAt = (a) => CURRENT_YEAR + (a - age);
  const premiumLeft = Math.max(0, p.premiumUntilAge - age);
  const lines = [];
  if (annualPolicyPremium(p) > 0) {
    lines.push(premiumLeft > 0
      ? `Pay ${fmt(annualPolicyPremium(p))} a year until age ${p.premiumUntilAge} (${premiumLeft} more year${premiumLeft === 1 ? "" : "s"}).`
      : "Premiums already paid up.");
  }
  if (paysIncome(p) && p.annualIncome > 0) {
    lines.push(`Receive ${fmt(p.annualIncome)} a year from age ${p.incomeStartAge} to ${p.incomeEndAge} (${yearAt(p.incomeStartAge)}–${yearAt(p.incomeEndAge)}).`);
  }
  if (paysMaturity(p)) {
    const amt = maturityAmount(p);
    lines.push(amt > 0
      ? `Receive ${fmt(amt)} at age ${p.maturityAge}, in ${yearAt(p.maturityAge)}${p.type === "term" ? " (premiums returned)" : ""}.`
      : `Matures at age ${p.maturityAge}. Add the maturity amount to count it.`);
  }
  if (p.type === "term" && !p.returnOfPremium) {
    lines.push("Pays nothing back while you are alive: pure protection.");
  }
  if (!lines.length) return null;
  return (
    <div className="rounded-lg p-3 space-y-1 bg-[var(--surface-raised)]">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">What this policy does</div>
      {lines.map((l) => <p key={l} className="text-xs text-[var(--text-secondary)]">{l}</p>)}
    </div>
  );
}
