"use client";

import MonthlySummary from "@/components/sections/MonthlySummary";
import ProjectionChart from "@/components/sections/ProjectionChart";
import { ToggleSwitch } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

/* The final read-only step. Goal editing moved to the Goal Workspace: asking
   someone to set goals and judge the result on the same screen meant they only
   found out whether the plan funded them at the point where there was nothing
   left to change. */
export default function StepReview({
  plan, findingsFor, age, lifeExpectancy,
  cplan, premiums, totalHoldings, simulation, totalMonthlyIncome,
  expectedXIRR, postRetireReturn, investmentStepUp, investSurplus, exitTaxRate,
  earliestRetireAge, goalPoints, setField,
  spouseMonthlyIncome, spouseHoldingsTotal,
}) {
  /* Offered only when there is something to combine. A disabled checkbox
     pointing back at a step the user has already left is an advertisement, not
     a control; discovery belongs to the Spouse card's own empty state. */
  const spouseHasData = !!plan.spouse?.enabled &&
    (spouseMonthlyIncome > 0 || spouseHoldingsTotal > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <MonthlySummary plan={plan} cplan={cplan} premiums={premiums}
            totalHoldings={totalHoldings} simulation={simulation}
            totalMonthlyIncome={totalMonthlyIncome} />
        </div>
        <div className="lg:col-span-7 space-y-4">
          {spouseHasData && (
            <div className="rounded-xl border p-4 space-y-2"
              style={{ background: "var(--surface-muted)", borderColor: "var(--border-subtle)" }}>
              <ToggleSwitch
                value={!!plan.combineSpouse}
                onChange={(v) => setField("combineSpouse", v)}
                label={plan.spouse?.name
                  ? `Include ${plan.spouse.name}'s income and holdings`
                  : "Include my spouse's income and holdings"}
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {plan.combineSpouse
                  ? <>This chart includes {fmt(spouseMonthlyIncome)}/mo of their
                      income and {fmt(spouseHoldingsTotal)} of their holdings.
                      Household expenses are still a single figure, so check it
                      covers both of you.</>
                  : <>Adds {fmt(spouseMonthlyIncome)}/mo of their income and{" "}
                      {fmt(spouseHoldingsTotal)} of their holdings. It changes
                      every projection, not just this chart.</>}
              </p>
            </div>
          )}
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
