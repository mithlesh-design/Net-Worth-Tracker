"use client";

import FinancialGoals from "@/components/sections/FinancialGoals";
import MonthlySummary from "@/components/sections/MonthlySummary";
import ProjectionChart from "@/components/sections/ProjectionChart";

export default function StepGoalsReview({
  plan, goals, addGoal, removeGoal, updateGoal,
  findingsFor, age, lifeExpectancy,
  cplan, premiums, totalHoldings, simulation, totalMonthlyIncome,
  expectedXIRR, postRetireReturn, investmentStepUp, investSurplus, exitTaxRate,
  earliestRetireAge, goalPoints,
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <FinancialGoals
            plan={plan} goals={goals} addGoal={addGoal}
            removeGoal={removeGoal} updateGoal={updateGoal}
            findingsFor={findingsFor} age={age} lifeExpectancy={lifeExpectancy}
            defaultOpen
          />
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
