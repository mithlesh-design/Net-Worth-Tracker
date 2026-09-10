"use client";

import MedicalInsurance from "@/components/sections/MedicalInsurance";
import LifeInsurance from "@/components/sections/LifeInsurance";

export default function StepProtection({ plan, setField, findingsFor }) {
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Do you have health or life insurance? Configure your policies below, or skip if you don't have any.
      </p>
      <MedicalInsurance plan={plan} setField={setField} findingsFor={findingsFor} />
      <LifeInsurance plan={plan} setField={setField} findingsFor={findingsFor} />
    </div>
  );
}
