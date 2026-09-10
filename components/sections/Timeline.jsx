"use client";

import { SliderInput, DerivedStat, FieldError } from "@/components/ui";
import { SectionCard } from "@/components/ui";

export default function Timeline({ plan, setField, findingsFor, age, ageIsDerived, currentAge, setCurrentAge, lifeExpectancy, setLifeExpectancy }) {
  return (
    <SectionCard title="Timeline">
      <div className="space-y-3">
        {ageIsDerived ? (
          <>
            <DerivedStat label="Current Age" value={`${age} yrs`} sub="from your date of birth" />
            <button onClick={() => setField("personal.dob", null)}
              className="text-xs underline" style={{ color: 'var(--text-muted)' }}>
              Clear date of birth to set age manually
            </button>
          </>
        ) : (
          <SliderInput label="Current Age" value={currentAge} onChange={setCurrentAge} min={18} max={65} suffix=" yrs" />
        )}
        <SliderInput label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} min={60} max={100} suffix=" yrs" />
        <SliderInput label="Retirement Age" value={plan.retirementAge}
          onChange={(v) => setField("retirementAge", v)} min={age} max={80} suffix=" yrs" />
        <FieldError findings={[...findingsFor("currentAge"), ...findingsFor("lifeExpectancy"), ...findingsFor("retirementAge")]} />
      </div>
    </SectionCard>
  );
}
