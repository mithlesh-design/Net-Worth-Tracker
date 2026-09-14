"use client";

import MonthlySummary from "@/components/sections/MonthlySummary";
import ProjectionChart from "@/components/sections/ProjectionChart";

/* The final read-only step. Goal editing moved to the Goal Workspace: asking
   someone to set goals and judge the result on the same screen meant they only
   found out whether the plan funded them at the point where there was nothing
   left to change. */
export default function StepReview({
  plan, findingsFor, age, lifeExpectancy,
  cplan, premiums, totalHoldings, simulation, totalMonthlyIncome,
  expectedXIRR, postRetireReturn, investmentStepUp, investSurplus, exitTaxRate,
  earliestRetireAge, goalPoints,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <MonthlySummary plan={plan} cplan={cplan} premiums={premiums}
            totalHoldings={totalHoldings} simulation={simulation}
            totalMonthlyIncome={totalMonthlyIncome} />
        </div>
        <div className="lg:col-span-7">
          <ProjectionChart
            plan={plan} simulation={simulation} age={age} lifeExpectancy={lifeExpectancy}
            expectedXIRR={expectedXIRR} postRetireReturn={postRetireReturn}
            investmentStepUp={investmentStepUp} investSurplus={investSurplus}
            exitTaxRate={exitTaxRate} earliestRetireAge={earliestRetireAge}
            goalPoints={goalPoints}
          />
        </div>
      </div>
      <div className="text-center pt-6 pb-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not financial advice · Consult a SEBI-registered advisor</p>
      </div>
    </div>
  );
}
