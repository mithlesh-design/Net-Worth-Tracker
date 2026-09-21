"use client";

import MonthlySummary from "@/components/sections/MonthlySummary";
import ProjectionChart from "@/components/sections/ProjectionChart";
import HouseholdInclusion from "@/components/sections/HouseholdInclusion";
import { SELF, includedPeople, personLabel, hasMembers } from "@/lib/household/members.mjs";

/* The final read-only step. Goal editing moved to the Goal Workspace: asking
   someone to set goals and judge the result on the same screen meant they only
   found out whether the plan funded them at the point where there was nothing
   left to change.

   Everything here is the HOUSEHOLD: whoever is switched on under Include in
   Household Calculation, against the household's full costs. */
export default function StepReview({
  plan, age, lifeExpectancy,
  premiums, totalHoldings, simulation, totalMonthlyIncome,
  expectedXIRR, postRetireReturn, investmentStepUp, investSurplus, exitTaxRate,
  earliestRetireAge, goalPoints, setField, scopeFor,
}) {
  /* "You, Priya" — named only once there is more than one person to name. */
  const household = hasMembers(plan)
    ? includedPeople(plan).map((p) => (p.id === SELF ? "You" : personLabel(plan, p.id))).join(", ")
    : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <MonthlySummary plan={plan} premiums={premiums}
            totalHoldings={totalHoldings} simulation={simulation}
            totalMonthlyIncome={totalMonthlyIncome} household={household} />
          <HouseholdInclusion plan={plan} setField={setField} scopeFor={scopeFor} />
        </div>
        <div className="lg:col-span-7 space-y-4">
          <ProjectionChart
            plan={plan} simulation={simulation} age={age} lifeExpectancy={lifeExpectancy}
            expectedXIRR={expectedXIRR} postRetireReturn={postRetireReturn}
            investmentStepUp={investmentStepUp} investSurplus={investSurplus}
            exitTaxRate={exitTaxRate} earliestRetireAge={earliestRetireAge}
            goalPoints={goalPoints} household={household}
          />
        </div>
      </div>
      <div className="text-center pt-6 pb-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not financial advice · Consult a SEBI-registered advisor</p>
      </div>
    </div>
  );
}
