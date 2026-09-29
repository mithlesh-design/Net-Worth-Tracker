"use client";

import {
  CollapsibleSection, SliderInput, SegmentedControl, YesNoField, ToggleSwitch,
  ItemCard, InfoStrip, DerivedStat, FieldError,
} from "@/components/ui";
import { fmt, monthlyEquivalent } from "@/lib/finance/format.mjs";
import { annualPremium } from "@/lib/finance/insurance.mjs";

const FREQUENCIES = ["monthly", "quarterly", "yearly"];

/* Client fields 8-9. Coverage is a protection amount: never an expense, never
   an asset. Only the premium touches cash flow. */
function PolicyBlock({ who, label, cfg, setField, findingsFor, sharedDisabled }) {
  const base = `medical.${who}`;
  const monthly = monthlyEquivalent(cfg.premium, cfg.premiumFrequency);

  return (
    <ItemCard>
      <YesNoField label={label} value={cfg.enabled} onChange={(v) => setField(`${base}.enabled`, v)} />

      {cfg.enabled && (
        <div className="space-y-3 pt-1">
          {/* Cover is EITHER a fixed amount OR unlimited, so the two sit in one
              box: the switch decides, and the amount below it locks when it is
              on. The typed amount is kept for switching back. */}
          <div className="rounded-lg border p-3 space-y-3 border-[var(--border-default)]">
            <ToggleSwitch
              label="Unlimited coverage amount"
              value={!!cfg.unlimitedCoverage}
              onChange={(v) => setField(`${base}.unlimitedCoverage`, v)}
            />
            <SliderInput
              label="Coverage amount (₹)"
              value={cfg.coverage}
              onChange={(v) => setField(`${base}.coverage`, v)}
              min={0} max={20000000} step={100000} prefix="₹" showWords
              disabled={!!cfg.unlimitedCoverage} disabledText="Unlimited"
            />
            <p className="text-[0.6rem] text-[var(--text-muted)]">
              {cfg.unlimitedCoverage
                ? "No amount needed: this policy has no upper limit on cover. Switch off to enter a fixed amount."
                : "Enter the sum insured, or switch on Unlimited if the policy has no upper limit."}
            </p>
          </div>

          {who === "parents" && (
            <SegmentedControl
              label="Premium"
              options={[
                { value: "separate", label: "Separate policy" },
                { value: "includedInSelfPolicy", label: "On my policy" },
              ]}
              value={cfg.premiumMode}
              onChange={(v) => setField(`${base}.premiumMode`, v)}
            />
          )}

          {sharedDisabled ? (
            <InfoStrip tone="blue">
              Counted once under your own policy. Your figure below is kept but not charged again.
            </InfoStrip>
          ) : null}

          <div className={sharedDisabled ? "opacity-50 pointer-events-none" : ""}>
            <SliderInput
              label="Premium (₹)"
              value={cfg.premium}
              onChange={(v) => setField(`${base}.premium`, v)}
              min={0} max={500000} step={1000} prefix="₹"
            />
            <div className="mt-3">
              <SegmentedControl
                label="Premium frequency"
                options={FREQUENCIES}
                value={cfg.premiumFrequency}
                onChange={(v) => setField(`${base}.premiumFrequency`, v)}
              />
            </div>
          </div>

          {!sharedDisabled && cfg.premium > 0 && (
            <DerivedStat
              label="Monthly equivalent"
              value={`${fmt(monthly)}/mo`}
              sub={`paid ${cfg.premiumFrequency}`}
            />
          )}
          <FieldError findings={findingsFor(base)} />
        </div>
      )}
    </ItemCard>
  );
}

export default function MedicalInsurance({ plan, setField, findingsFor }) {
  const m = plan.medical;
  const shared = m.parents.enabled && m.parents.premiumMode === "includedInSelfPolicy";
  const premiums = annualPremium(m);
  const covered = (m.self.enabled ? 1 : 0) + (m.parents.enabled ? 1 : 0);

  /* The badge has to answer "is there anything in here?" without being opened
     — this card is collapsed inside Income & Expenses now, not a step of its
     own. */
  return (
    <CollapsibleSection
      title="Medical Insurance"
      defaultOpen={false}
      badge={covered ? `${covered} · ${fmt(premiums.total / 12)}/mo` : "None"}
    >
      <PolicyBlock
        who="self" label="Do you have any Medical Insurance of your own?"
        cfg={m.self} setField={setField} findingsFor={findingsFor} sharedDisabled={false}
      />
      <PolicyBlock
        who="parents" label="Do you have Medical Insurance cover for your parents?"
        cfg={m.parents} setField={setField} findingsFor={findingsFor} sharedDisabled={shared}
      />

      {premiums.total > 0 && (
        <DerivedStat
          label="Total premium"
          value={`${fmt(premiums.total / 12)}/mo`}
          sub={`${fmt(premiums.total)}/yr`}
        />
      )}

      <InfoStrip tone="blue">
        Coverage is the amount you are protected for. It is not a monthly expense
        and it is not added to your net worth. Only the premium affects cash flow.
      </InfoStrip>
    </CollapsibleSection>
  );
}
