"use client";

import { SectionCard, TextField, DateField, InfoStrip, FieldError } from "@/components/ui";
import { ageFromDob, todayISO } from "@/lib/finance/age.mjs";

/* Client fields 1-2: Full Name and Date of Birth. */
export default function PersonalDetails({ plan, setField, findingsFor }) {
  const dob = plan.personal.dob;
  const derivedAge = ageFromDob(dob);

  return (
    <SectionCard title="Personal Details">
      <div className="space-y-3">
        <TextField
          label="Full Name"
          value={plan.personal.fullName}
          onChange={(v) => setField("personal.fullName", v)}
          placeholder="Your name"
          hint="Separate from the name you give a saved scenario."
        />
        <DateField
          label="Date of Birth"
          value={dob}
          max={todayISO()}
          onChange={(v) => setField("personal.dob", v)}
          invalid={findingsFor("personal.dob").length > 0}
          hint={derivedAge === null ? "Sets your current age in the Timeline." : undefined}
        />
        {derivedAge !== null && derivedAge >= 0 && (
          <InfoStrip tone="blue">
            Current age <strong>{derivedAge}</strong>, calculated from your date of birth.
            The Timeline uses this figure.
          </InfoStrip>
        )}
        <FieldError findings={findingsFor("personal")} />
      </div>
    </SectionCard>
  );
}
