"use client";

import FinancialGoals from "@/components/sections/FinancialGoals";
import GoalGapChart from "@/components/sections/GoalGapChart";
import GoalFundingTable from "@/components/sections/GoalFundingTable";
import { ToggleSwitch, InfoStrip, Card } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { CURRENT_YEAR } from "@/lib/finance/format.mjs";

/* Goals used to sit on the final step, alongside the verdict on them. Here
   they get their own workspace, one step before the investment levers, so a
   shortfall is something the user can still act on. */
export default function StepGoalWorkspace({
  plan, setField, goals, saveGoal, removeGoal,
  findingsFor, age, lifeExpectancy, earliestRetireAge, goalGap,
}) {
  /* The clearest example of what the toggle does, drawn from the user's own
     goals: the one whose price moves most. An abstract explanation of
     inflation convinces nobody; "80.8 L in 2043" does. */
  const example = [...(goalGap?.goals ?? [])]
    .filter((g) => g.status !== "outOfHorizon" && g.status !== "inThePast" && g.yearsAway > 0)
    .sort((a, b) => b.inflationGap - a.inflationGap)[0];

  const exampleInflated = example
    ? example.fullCostToday * Math.pow(1 + example.inflationUsed / 100, example.yearsAway)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <div className="space-y-6 2xl:col-span-5">
          <FinancialGoals
            plan={plan} goals={goals} saveGoal={saveGoal}
            removeGoal={removeGoal}
            findingsFor={findingsFor} age={age} lifeExpectancy={lifeExpectancy}
            defaultOpen
          />
          <GoalFundingTable goalGap={goalGap} plan={plan} />
        </div>

        <div className="space-y-6 2xl:col-span-7">
          <GoalGapChart
            goalGap={goalGap} plan={plan} age={age}
            lifeExpectancy={lifeExpectancy} earliestRetireAge={earliestRetireAge}
          />

          <Card className="space-y-3 p-5 sm:p-7">
            <ToggleSwitch
              label="Price my goals in future rupees"
              value={!!plan.inflateGoals}
              onChange={(v) => setField("inflateGoals", v)}
            />
            <p className="text-body" style={{ color: "var(--text-secondary)" }}>
              {plan.inflateGoals ? (
                <>
                  Your projection charges each goal what it will actually cost by then.
                  {example && (
                    <> {example.name} is {fmt(example.fullCostToday)} today and{" "}
                      {fmt(exampleInflated)} by {CURRENT_YEAR + example.yearsAway}.</>
                  )}
                </>
              ) : (
                <>
                  Your projection charges each goal its price today.
                  {example && (
                    <> {example.name} would be {fmt(exampleInflated)} by{" "}
                      {CURRENT_YEAR + example.yearsAway}, not {fmt(example.fullCostToday)}.</>
                  )}
                </>
              )}
            </p>
          </Card>

          {!plan.inflateGoals && goalGap?.hasGoals && goalGap.totals.inflationGap > 1 && (
            <InfoStrip tone="amber">
              Your projection is charging {fmt(goalGap.totals.requiredToday)} for these goals —
              {" "}{fmt(goalGap.totals.inflationGap)} less than they should cost by the time you
              pay for them. Turn on future pricing to plan against the real number.
            </InfoStrip>
          )}
        </div>
      </div>
    </div>
  );
}
