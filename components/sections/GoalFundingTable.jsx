"use client";

import { SectionCard } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { goalEmoji } from "@/lib/profile/goalTypes.mjs";

const STATUS = {
  funded: { label: "On track", color: "var(--success)" },
  partial: { label: "Partly funded", color: "var(--warning)" },
  unfunded: { label: "Not funded", color: "var(--danger)" },
  outOfHorizon: { label: "Past your horizon", color: "var(--text-muted)" },
  inThePast: { label: "Before today", color: "var(--text-muted)" },
};

function GoalRow({ goal, inflateGoals }) {
  const s = STATUS[goal.status] ?? STATUS.funded;
  const excluded = goal.status === "outOfHorizon" || goal.status === "inThePast";
  const pct = Math.round(goal.fundedPct * 100);

  return (
    <div className="py-3 border-b last:border-b-0" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
          <span className="mr-1.5">{goalEmoji(goal.emoji)}</span>
          {goal.name}
        </span>
        <span className="text-[0.65rem] font-semibold whitespace-nowrap" style={{ color: s.color }}>
          {s.label}
        </span>
      </div>

      {excluded ? (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {goal.status === "outOfHorizon"
            ? `Set for age ${goal.age}, beyond the horizon you're planning to — so the projection never charges it.`
            : `Set for age ${goal.age}, which is already behind you.`}
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 mt-1.5 text-xs">
            {/* The bar measures what the plan pays against what it is charged,
                so the figure beside it has to be that same charge — pairing the
                bar with the real cost would make a 100%%-funded goal look
                underfunded. The real cost gets its own line below. */}
            <span style={{ color: "var(--text-secondary)" }}>
              Plan pays {fmt(goal.requiredToday)} at {goal.age}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {pct}% funded
            </span>
          </div>

          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--wizard-track)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
          </div>

          {/* Two different problems, never blended into one number.

              gap is the portfolio one: the plan could not pay what it was
              charged. inflationGap is the pricing one: it was charged the
              wrong amount. Saving more fixes the first; the future-rupees
              toggle fixes the second. */}
          {goal.gap > 1 && (
            <p className="text-xs mt-1.5" style={{ color: "var(--danger)" }}>
              Your plan comes up {fmt(goal.gap)} short of paying for this.
            </p>
          )}

          {!inflateGoals && goal.inflationGap > 1 && (
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              Charged at {fmt(goal.requiredToday)}, its price today. By {goal.age} it
              should cost about {fmt(goal.requiredInflated)}
              {goal.inflationUsed !== undefined && ` at ${goal.inflationUsed}%/yr`}.
            </p>
          )}

          {goal.hasLoan && (
            <p className="text-[0.65rem] mt-1" style={{ color: "var(--text-subtle)" }}>
              Financed · {fmt(goal.fullCostToday)} total, only the down payment comes from your portfolio
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function GoalFundingTable({ goalGap, plan }) {
  if (!goalGap) return null;
  const { goals, totals, hasGoals, allFunded } = goalGap;

  if (!goals.length) {
    return (
      <SectionCard title="Goal funding">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Add a goal above and this will show whether your plan gets you there.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Goal funding">
      {hasGoals && (
        <div className="pb-3 mb-1 border-b" style={{ borderColor: "var(--border-default)" }}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {allFunded ? "Real cost of all your goals" : "Total shortfall"}
            </span>
            <span
              className="text-base font-black tabular-nums"
              style={{ color: allFunded ? "var(--text-primary)" : "var(--danger)" }}
            >
              {allFunded ? fmt(totals.requiredInflated) : fmt(totals.gap)}
            </span>
          </div>
          {!plan?.inflateGoals && totals.inflationGap > 1 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Your projection charges {fmt(totals.requiredToday)} for these —
              {" "}{fmt(totals.inflationGap)} less than they should cost by then.
            </p>
          )}
        </div>
      )}

      <div>
        {goals.map((g) => (
          <GoalRow key={g.id} goal={g} inflateGoals={!!plan?.inflateGoals} />
        ))}
      </div>
    </SectionCard>
  );
}
