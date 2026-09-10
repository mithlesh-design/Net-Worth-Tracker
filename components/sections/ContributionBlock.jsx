"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  SliderInput, SegmentedControl, ToggleSwitch, InfoStrip, DerivedStat, FieldError,
} from "@/components/ui";
import { fmt, monthlyEquivalent, toAnnual } from "@/lib/finance/format.mjs";
import { BUCKET_DEFS } from "@/lib/finance/assumptions.mjs";

const FREQUENCIES = ["monthly", "quarterly", "yearly"];

/* Simple future value on the same annual-lump convention the engine uses, so
   this figure and the chart never disagree. Estimate only. */
export function futureValue({ annual, annualReturn, stepUp, years, opening = 0 }) {
  let bal = opening;
  for (let y = 0; y <= years; y++) {
    if (y > 0) bal *= 1 + annualReturn / 100;
    bal += annual * Math.pow(1 + stepUp / 100, y);
  }
  return bal;
}

/* One expandable calculator. Used for all seven client contribution streams,
   so they behave identically and nothing is special-cased by accident. */
export default function ContributionBlock({
  keyName, label, cfg, bucket, plan, setField, findingsFor,
  holdingKey = null, holdingLabel = null, holdingHint = null,
  allowPayroll = false, yearsToRetire, extra = null, note = null,
}) {
  const [open, setOpen] = useState(false);
  const base = `contributions.${keyName}`;
  const monthly = monthlyEquivalent(cfg.amount, cfg.frequency);
  const annual = toAnnual(cfg.amount, cfg.frequency);
  const rate = cfg.annualReturn ?? (BUCKET_DEFS[bucket]?.defaultReturn ?? plan.expectedXIRR);
  const isEstimate = BUCKET_DEFS[bucket]?.rateIsEstimate;
  const opening = holdingKey ? (plan.holdings[holdingKey] ?? 0) : 0;
  const fv = futureValue({ annual, annualReturn: rate, stepUp: cfg.stepUp ?? 0, years: yearsToRetire, opening });

  return (
    <div className="rounded-xl border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left px-3 py-2.5">
        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <span className="flex items-center gap-2">
          <span className="text-[0.6rem] font-bold" style={{ color: 'var(--financial-projection)' }}>{fmt(monthly)}/mo</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            style={{ color: 'var(--text-muted)' }} />
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          <SliderInput
            label={`Amount (${cfg.frequency})`}
            value={cfg.amount}
            onChange={(v) => setField(`${base}.amount`, v)}
            min={0} max={500000} step={500} prefix="₹" showWords
          />
          <SegmentedControl
            label="Frequency"
            options={FREQUENCIES}
            value={cfg.frequency}
            onChange={(v) => setField(`${base}.frequency`, v)}
          />
          {cfg.frequency !== "monthly" && cfg.amount > 0 && (
            <DerivedStat label="Monthly equivalent" value={`${fmt(monthly)}/mo`}
              sub={`paid ${cfg.frequency}`} />
          )}

          {allowPayroll && (
            <div className="pt-1">
              <ToggleSwitch
                value={cfg.fundedFromPayroll}
                onChange={(v) => setField(`${base}.fundedFromPayroll`, v)}
                label="Already deducted from my pay"
              />
              <p className="text-[0.55rem] mt-1" style={{ color: 'var(--text-muted)' }}>
                {cfg.fundedFromPayroll
                  ? "Will not be subtracted from your take-home cash again."
                  : "Paid from your take-home cash."}
              </p>
            </div>
          )}

          {extra}

          {/* The SAME field the Current Holdings card edits. One value, two
              views, so a balance cannot be entered twice. */}
          {holdingKey && (
            <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
              <SliderInput
                label={holdingLabel ?? "Current value (₹)"}
                value={plan.holdings[holdingKey] ?? 0}
                onChange={(v) => setField(`holdings.${holdingKey}`, v)}
                min={0} max={50000000} step={10000} prefix="₹" showWords
              />
              <p className="text-[0.55rem] mt-1" style={{ color: 'var(--text-muted)' }}>
                {holdingHint ?? "Value today. Shared with the Current Holdings card."}
              </p>
            </div>
          )}

          {/* Supporting assumptions, marked as assumptions. */}
          <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--border-secondary)' }}>
            <div className="text-[0.55rem] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Assumptions {isEstimate ? "(estimate)" : ""}
            </div>
            <SliderInput
              label="Expected annual return"
              value={rate}
              onChange={(v) => setField(`${base}.annualReturn`, v)}
              min={0} max={25} step={0.1} suffix="%"
            />
            <SliderInput
              label="Annual contribution increase"
              value={cfg.stepUp ?? 0}
              onChange={(v) => setField(`${base}.stepUp`, v)}
              min={0} max={30} step={1} suffix="%"
            />
          </div>

          {annual > 0 && (
            <DerivedStat
              label={`Estimated value at ${plan.retirementAge}`}
              value={fmt(fv)}
              sub="Estimate based on the assumptions above. Not a guaranteed return."
            />
          )}

          {note}
          <FieldError findings={findingsFor(base)} />
        </div>
      )}
    </div>
  );
}
