"use client";

import FinancialGoals from "@/components/sections/FinancialGoals";
import GoalGapChart from "@/components/sections/GoalGapChart";
import GoalFundingTable from "@/components/sections/GoalFundingTable";
import { ToggleSwitch, InfoStrip } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { CURRENT_YEAR } from "@/lib/finance/format.mjs";

/* Goals used to sit on the final step, alongside the verdict on them. Here
   they get their own workspace, one step before the investment levers, so a
   shortfall is something the user can still act on. */
export default function StepGoalWorkspace({
  plan, setField, goals, addGoal, removeGoal, updateGoal,
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
          <GoalFundingTable goalGap={goalGap} plan={plan} />
        </div>

        <div className="lg:col-span-7 space-y-4">
          <GoalGapChart
            goalGap={goalGap} plan={plan} age={age}
            lifeExpectancy={lifeExpectancy} earliestRetireAge={earliestRetireAge}
          />

          <div
            className="rounded-xl border p-4 space-y-2"
            style={{ background: "var(--surface-muted)", borderColor: "var(--border-subtle)" }}
          >
            <ToggleSwitch
              label="Price my goals in future rupees"
              value={!!plan.inflateGoals}
              onChange={(v) => setField("inflateGoals", v)}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
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
          </div>

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
