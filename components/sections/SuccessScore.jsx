"use client";

import { memo } from "react";
import { Progress, InfoStrip, DerivedStat } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

/* Tiers, not a gradient: a score is acted on, and three bands with plain names
   are easier to act on than a continuous colour ramp. */
function tierOf(score) {
  if (score >= 80) return { color: "var(--success)", label: "On track" };
  if (score >= 60) return { color: "var(--warning)", label: "Workable, with room to improve" };
  return { color: "var(--danger)", label: "Needs attention" };
}

/* `caption` says whose money the score is about once there is more than one
   person to be about. The score is always the household's. */
function SuccessScore({ result, stale, hasGoals, lifeExpectancy, caption = null }) {
  if (!result) return null;

  const {
    score, band, runs, corpus, deterministic, failures, enoughInput,
  } = result;

  if (!enoughInput) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--chart-surface)", borderColor: "var(--border-default)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Success Score
        </h3>
        <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
          Add your holdings, income or monthly investments and this will estimate your
          chance of funding your plan.
        </p>
        {caption && <Caption>{caption}</Caption>}
      </div>
    );
  }

  const tier = tierOf(score);
  const goalDriven = failures.reasons.find((r) => r.kind === "goal");

  return (
    <div
      className="rounded-xl border p-5 sm:p-6 transition-opacity duration-200"
      style={{
        background: "var(--chart-surface)",
        borderColor: "var(--border-default)",
        opacity: stale ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Success Score
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {stale ? "Updating…" : tier.label}
          </p>
          {caption && <Caption>{caption}</Caption>}
        </div>
        <div className="text-right">
          {/* Never a bare integer. At 200 runs the sampling error is about
              ±2.8 points, so the band IS the honest precision. */}
          <div
            className="text-4xl font-black tabular-nums leading-none"
            style={{ color: tier.color }}
          >
            {band.lo}&ndash;{band.hi}%
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            chance of success
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Progress value={score} indicatorColor={tier.color} className="h-2" />
      </div>

      <p className="text-sm mt-3" style={{ color: "var(--text-secondary)" }}>
        {/* The band, not the raw score: quoting 59% one line under a headline
            that says 55-60 undercuts the point of showing a band at all. */}
        Across {runs} simulated market paths, {band.lo}&ndash;{band.hi}% of them{" "}
        {hasGoals
          ? `funded every goal without running out before ${lifeExpectancy}.`
          : `kept you going to ${lifeExpectancy} without running out.`}
        {failures.count > 0 && failures.firstFailureAge.p50 != null && (
          <>
            {" "}In the runs that failed, money typically ran out around age{" "}
            {Math.round(failures.firstFailureAge.p50)}
            {goalDriven ? ", usually on a goal payment." : "."}
          </>
        )}
      </p>

      <div className="grid grid-cols-3 gap-3 mt-5">
        {/* A depleted run ends below zero. Rendering that as a flat "₹0" reads
            as "you end with nothing left over" when it actually means the money
            ran out before the end — a materially different thing to be told. */}
        <DerivedStat
          label="Poor markets (p10)"
          value={corpus.p10 <= 0 ? "Runs out" : fmt(corpus.p10)}
          sub={corpus.p10 <= 0
            ? (failures.firstFailureAge.p10 != null
                ? `around age ${Math.round(failures.firstFailureAge.p10)}`
                : "before the end")
            : `at ${lifeExpectancy}`}
          tone={corpus.p10 <= 0 ? "warn" : "default"}
        />
        <DerivedStat label="Middle (p50)" value={fmt(Math.max(0, corpus.p50))}
          sub={`at ${lifeExpectancy}`} />
        <DerivedStat label="Strong markets (p90)" value={fmt(Math.max(0, corpus.p90))}
          sub={`at ${lifeExpectancy}`} />
      </div>

      {/* The median of a log-normal sits below its mean, so the simulated
          middle will always read lower than the straight-line projection. Shown
          together and labelled, that is informative; shown apart, it looks like
          two parts of the app disagreeing. */}
      <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
        Your straight-line projection ends at {fmt(Math.max(0, deterministic))}. The middle
        outcome above is lower because it accounts for bad years as well as good ones.
      </p>

      <div className="mt-4">
        <InfoStrip tone="amber">
          An estimate, not a forecast. Built from assumed volatilities per instrument, with
          every asset moving together in a bad year — a deliberately cautious simplification.
        </InfoStrip>
      </div>
    </div>
  );
}

function Caption({ children }) {
  return (
    <p className="text-xs mt-1.5" style={{ color: "var(--text-subtle)" }}>{children}</p>
  );
}

/* Memoised: the expensive subtree should not re-render because something
   unrelated in the prop bag changed. */
export default memo(SuccessScore);
