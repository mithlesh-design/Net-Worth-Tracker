"use client";

import { UserRound } from "lucide-react";
import { SectionCard, TextField, DateField, InfoStrip, FieldError } from "@/components/ui";
import { ageFromDob, todayISO } from "@/lib/finance/age.mjs";

/* Client fields 1-2: Full Name and Date of Birth. */
export default function PersonalDetails({ plan, setField, findingsFor }) {
  const dob = plan.personal.dob;
  const derivedAge = ageFromDob(dob);

  return (
    <SectionCard title="Personal Details" icon={UserRound} kicker="Your journey. Our focus.">
      <div className="space-y-5">
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
          <InfoStrip tone="amber">
            Current age: <strong>{derivedAge}</strong> &mdash; used to personalize your financial timeline.
          </InfoStrip>
        )}
        <FieldError findings={findingsFor("personal")} />
      </div>
    </SectionCard>
  );
}
