"use client";

import FinancialGoals from "@/components/sections/FinancialGoals";
import MiniChart from "@/components/wizard/MiniChart";

/* Goals used to sit on the final step, alongside the verdict on them. Here
   they get their own workspace, one step before the investment levers, so a
   shortfall is something the user can still act on. The Goal Gap chart lands
   in the right-hand column next. */
export default function StepGoalWorkspace({
  plan, goals, addGoal, removeGoal, updateGoal,
  findingsFor, age, lifeExpectancy, simulation,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Goal Workspace
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          What you&rsquo;re saving for, and whether your current trajectory gets you there.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <FinancialGoals
            plan={plan} goals={goals} addGoal={addGoal}
            removeGoal={removeGoal} updateGoal={updateGoal}
            findingsFor={findingsFor} age={age} lifeExpectancy={lifeExpectancy}
            defaultOpen
          />
        </div>
        <div className="lg:col-span-7 space-y-4">
          <MiniChart
            simulation={simulation}
            currentAge={plan.currentAge}
            lifeExpectancy={plan.lifeExpectancy}
            retirementAge={plan.retirementAge}
          />
        </div>
      </div>
    </div>
  );
}
