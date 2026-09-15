"use client";

import IncomeSources from "@/components/sections/IncomeSources";
import { CollapsibleSection, ToggleSwitch, TextField, InfoStrip, DerivedStat } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

/* A second earner, kept as their own block rather than extra rows on the
   primary income list. Two reasons: their money can be excluded from the
   projection without deleting it, and their retirement age stays legible beside
   their own income instead of hiding in a filtered list.

   The income list itself is the same component the primary uses — see the note
   on IncomeSources for why it is parameterised rather than copied. */
export default function SpouseIncome({
  plan, setField, findingsFor,
  spouseIncomes, updateSpouseIncome, addSpouseIncome, removeSpouseIncome,
  spouseMonthlyIncome,
}) {
  const spouse = plan.spouse ?? {};
  const enabled = !!spouse.enabled;

  return (
    <CollapsibleSection
      title="Spouse / Partner"
      badge={enabled ? `${spouseIncomes.length}` : "Off"}
      defaultOpen={false}
    >
      <ToggleSwitch
        value={enabled}
        onChange={(v) => setField("spouse.enabled", v)}
        label="I have a spouse or partner with an income"
      />

      {!enabled ? (
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Turn this on to record their income and holdings. Nothing here affects
          your projection until you choose to combine them.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <TextField
            label="Their name (optional)"
            value={spouse.name ?? ""}
            onChange={(v) => setField("spouse.name", v)}
            placeholder="e.g. Priya"
          />

          <IncomeSources
            plan={plan}
            incomes={spouseIncomes}
            updateIncome={updateSpouseIncome}
            addIncome={addSpouseIncome}
            removeIncome={removeSpouseIncome}
            findingsFor={findingsFor}
            totalMonthlyIncome={spouseMonthlyIncome}
            title="Their income"
            pathPrefix="spouse.incomes"
            /* Their list may be emptied entirely; yours may not. */
            minItems={0}
            showHint={false}
            defaultOpen
          />

          {spouseIncomes.length === 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No income recorded for them yet.
            </p>
          )}

          <DerivedStat
            label="Their monthly income"
            value={`${fmt(spouseMonthlyIncome)}/mo`}
            sub={`${fmt(spouseMonthlyIncome * 12)}/yr take-home`}
          />

          <InfoStrip tone="amber">
            Recorded, but not yet in your projection. Combining the two is a
            separate choice — and household expenses are a single figure on this
            page, so check yours already covers both of you before you make it.
          </InfoStrip>
        </div>
      )}
    </CollapsibleSection>
  );
}
