"use client";

import PersonalDetails from "@/components/sections/PersonalDetails";
import Timeline from "@/components/sections/Timeline";

export default function StepAboutYou({ plan, setField, findingsFor, age, ageIsDerived, currentAge, setCurrentAge, lifeExpectancy, setLifeExpectancy }) {
  return (
    <div className="space-y-4">
      <PersonalDetails plan={plan} setField={setField} findingsFor={findingsFor} />
      <Timeline
        plan={plan} setField={setField} findingsFor={findingsFor}
        age={age} ageIsDerived={ageIsDerived}
        currentAge={currentAge} setCurrentAge={setCurrentAge}
        lifeExpectancy={lifeExpectancy} setLifeExpectancy={setLifeExpectancy}
      />
    </div>
  );
}
