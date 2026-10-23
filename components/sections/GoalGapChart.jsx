"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Customized,
} from "recharts";
import { fmt, fmtAxis } from "@/lib/finance/format.mjs";
import { TrendingUp } from "lucide-react";
import GoalIcon from "@/components/ui/GoalIcon";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/ui/SectionHeader";
import ChartLegend from "@/components/charts/ChartLegend";
import { BreakdownRow, ChartTooltipCard, ChartReadout } from "@/components/charts/ChartBreakdown";
import { useChartLayout, useChartSelection, refLabelPosition } from "@/components/charts/useChartLayout.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";
import { useAnimatedDomain } from "./useAnimatedDomain.mjs";

/* One age on the goal-gap chart: the corpus against what the goals still
   ahead will cost, and any goal that comes due that year. Shown in the
   tooltip, or in the readout on a phone. */
function GoalGapBreakdown({ d, goalGap }) {
  const short = d.gapHeight > 1;
  const dueHere = goalGap.goals.filter((g) => g.age === d.age && g.status !== "outOfHorizon");

  return (
    <>
      <div className="text-subtitle mb-2" style={{ color: 'var(--text-primary)' }}>Age {d.age}</div>

      <div className="space-y-1">
        <BreakdownRow label="Projected corpus" value={fmt(d.projected)} tone="var(--financial-projection)" />
        <BreakdownRow label="Needed for goals ahead" value={fmt(d.required)} tone="var(--value-target)" />
        <BreakdownRow rule strong label={short ? "Short by" : "Ahead by"}
          value={fmt(short ? d.gapHeight : d.projected - d.required)}
          tone={short ? 'var(--danger)' : 'var(--success)'} />
        {d.requiredFV > 0 && (
          <BreakdownRow label="Sticker price of those goals" value={fmt(d.requiredFV)} />
        )}
      </div>

      {dueHere.length > 0 && (
        <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: 'var(--border-subtle)' }}>
          {dueHere.map((g) => (
            <BreakdownRow key={g.id}
              label={<span className="inline-flex items-center gap-1.5"><GoalIcon type={g.emoji} size={ICON_SIZE.xs} />{g.name}</span>}
              value={`${"−"}${fmt(g.requiredInflated)}`} tone="var(--value-target)" />
          ))}
        </div>
      )}
    </>
  );
}

function GoalGapTooltip({ active, payload, goalGap }) {
  if (!active || !payload?.length) return null;
  return <ChartTooltipCard><GoalGapBreakdown d={payload[0].payload} goalGap={goalGap} /></ChartTooltipCard>;
}

/* Draws nothing: on a phone the tooltip only supplies the cursor line. */
const NoTooltip = () => null;

/* Pins sit on the REQUIREMENT curve, not the corpus curve: the thing being
   marked is the demand, and the vertical distance from the pin down to the
   navy area is the gap being described. Same Customized escape hatch the
   projection chart uses to reach Recharts' internal d3 scales. */
function GoalPins({ goals, series, xScale, yScale, R }) {
  const byAge = new Map(series.map((p) => [p.age, p]));
  const seen = new Map();

  /* required(a) counts only goals AFTER a, so at a goal's own age the curve has
     already stepped down. Anchoring a pin there would float it below the line
     it is marking. Add back what comes due at that age and the pin lands on the
     top of its own step, which is where the eye expects it. */
  const dueAt = new Map();
  for (const g of goals) {
    if (g.status === "outOfHorizon" || g.status === "inThePast") continue;
    dueAt.set(g.age, (dueAt.get(g.age) ?? 0) + g.requiredInflated);
  }

  return (
    <>
      {goals.map((goal) => {
        if (goal.status === "outOfHorizon" || goal.status === "inThePast") return null;
        const pt = byAge.get(goal.age);
        if (!pt) return null;
        const cx = xScale(pt.age);
        const cy = yScale(Math.max(0, pt.required + (dueAt.get(goal.age) ?? 0)));
        if (!isFinite(cx) || !isFinite(cy)) return null;

        /* Two goals on the same age would otherwise draw on top of each
           other. Stack them upward. */
        const n = seen.get(goal.age) ?? 0;
        seen.set(goal.age, n + 1);

        const STEM = 6;
        const by = cy - STEM - R - n * (R * 2 + 4);
        const unfunded = goal.gap > 1;

        return (
          <g key={goal.id}>
            <line x1={cx} y1={cy} x2={cx} y2={by + R} stroke="var(--chart-target)" strokeWidth={1.5} strokeOpacity={0.7} />
            {n === 0 && <circle cx={cx} cy={cy} r={3.5} fill="var(--chart-target)" />}
            <circle
              cx={cx} cy={by} r={R}
              fill="var(--goal-marker-fill)"
              stroke={unfunded ? "var(--chart-negative)" : "var(--chart-target)"}
              strokeWidth={1.5}
            />
            <foreignObject x={cx - R} y={by - R} width={R * 2} height={R * 2} style={{ overflow: "visible" }}>
              <div style={{ width: R * 2, height: R * 2, display: "flex", alignItems: "center", justifyContent: "center", color: unfunded ? "var(--chart-negative)" : "var(--chart-target)" }}>
                <GoalIcon type={goal.emoji} size={R < 14 ? ICON_SIZE.xs : ICON_SIZE.sm} />
              </div>
            </foreignObject>
          </g>
        );
      })}
    </>
  );
}

function GoalPinsCustomized(props) {
  const xAxis = props.xAxisMap?.[Object.keys(props.xAxisMap || {})[0]];
  const yAxis = props.yAxisMap?.[Object.keys(props.yAxisMap || {})[0]];
  if (!xAxis?.scale || !yAxis?.scale) return null;
  return <GoalPins goals={props.goals} series={props.series} xScale={xAxis.scale} yScale={yAxis.scale} R={props.R} />;
}

export default function GoalGapChart({
  goalGap, plan, age, lifeExpectancy, earliestRetireAge,
}) {
  const full = goalGap?.series ?? [];
  const allGoals = goalGap?.goals ?? [];

  /* Window the chart to the goal horizon rather than the whole lifespan.

     Drawn to 85, this chart is useless: the corpus peaks near 88 Cr while the
     goals need about 24 L, so on a shared linear axis the gold line flattens
     onto zero and the gap — the entire point — is invisible. Goals all land in
     the first third of the chart anyway; the years after the last one have no
     requirement to compare against. The Review step's projection chart is the
     one that covers the full life.

     A little headroom past the last goal so the final pin is not jammed
     against the right edge. */
  const lastGoalAge = allGoals
    .filter((g) => g.status !== "outOfHorizon" && g.status !== "inThePast")
    .reduce((m, g) => Math.max(m, g.age), 0);

  const startAge = full[0]?.age ?? age;
  const windowEnd = lastGoalAge > 0
    ? Math.min(lifeExpectancy, lastGoalAge + Math.max(2, Math.round((lastGoalAge - startAge) * 0.15)))
    : lifeExpectancy;

  const series = full.filter((p) => p.age <= windowEnd);

  /* What comes due at each age, for both the ceiling above and the pin
     anchoring inside GoalPins. */
  const dueByAge = new Map();
  for (const g of allGoals) {
    if (g.status === "outOfHorizon" || g.status === "inThePast") continue;
    dueByAge.set(g.age, (dueByAge.get(g.age) ?? 0) + g.requiredInflated);
  }

  /* Both curves must fit, so the ceiling is the higher of the two peaks within
     the window — including the step a goal creates at its own age, since that
     is where its pin is anchored.

     Extra headroom when there are pins: a pin floats a stem plus its own radius
     above the curve, so a 10% margin leaves the tallest one clipped out of the
     plot and sitting up among the legend. */
  const peakDemand = series.reduce(
    (m, p) => Math.max(m, p.projected, p.required + (dueByAge.get(p.age) ?? 0)), 0);
  const yMax = useAnimatedDomain(Math.max(peakDemand * (lastGoalAge > 0 ? 1.32 : 1.1), 1));

  const layout = useChartLayout();
  const { compact } = layout;
  /* A phone opens the readout on the first goal: the first place the two
     lines are compared. */
  const firstGoalAge = allGoals
    .filter((g) => g.status !== "outOfHorizon" && g.status !== "inThePast")
    .reduce((m, g) => Math.min(m, g.age), Infinity);
  const firstGoalIndex = series.findIndex((p) => p.age === firstGoalAge);
  const selection = useChartSelection(series.length, firstGoalIndex >= 0 ? firstGoalIndex : 0);

  if (!series.length) return null;

  const selected = compact && goalGap?.hasGoals ? series[selection.index] : null;

  const { goals, hasGoals, allFunded, coversRealCost, crossoverAge } = goalGap;
  const shortGoals = goals.filter((g) => g.gap > 1 && g.status !== "outOfHorizon" && g.status !== "inThePast");
  /* The rates the gold line was actually priced at. Each goal carries its own
     (goalInflationRate), so general inflation is the wrong figure to quote. */
  const pricedAt = [...new Set(goals.filter((g) => g.inflationGap > 1).map((g) => g.inflationUsed))];

  return (
    <Card className="p-card">
      <SectionHeader icon={TrendingUp} title="Goal Gap" className="mb-3" />
      <p className="mb-3 text-body" style={{ color: 'var(--text-secondary)' }}>
        Your trajectory against what your goals demand
      </p>
      <ChartLegend className="mb-3" items={[
        { label: "Your corpus", kind: "line", color: "var(--chart-primary)" },
        { label: "Goals need", kind: "dash", color: "var(--chart-target)" },
      ]} />

      <div ref={layout.ref} className="relative h-72 touch-pan-y sm:h-80 lg:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={layout.margin} {...(selected ? selection.handlers : {})}>
            <defs>
              {/* Gradient ids are document-global; nwGrad and miniNwGrad are taken. */}
              <linearGradient id="ggProjGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity="var(--gradient-start-opacity)" />
                <stop offset="70%" stopColor="var(--chart-primary)" stopOpacity="var(--gradient-mid-opacity)" />
                <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ggGapGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-target)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--chart-target)" stopOpacity={0.10} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="age" type="number" domain={[startAge, windowEnd]} {...layout.xTicks}
              tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={layout.tickMargin}
              tick={{ fontSize: 12, fill: "var(--chart-tick)" }}
              label={{ value: "Age", position: "insideBottomRight", offset: -12, fill: "var(--chart-tick)", fontSize: 12 }}
            />
            <YAxis
              tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={layout.tickMargin}
              tickFormatter={fmtAxis} tick={{ fontSize: 12, fill: "var(--chart-tick)" }}
              width={layout.yAxisWidth} domain={[0, Math.round(yMax)]} allowDataOverflow={false}
            />
            <Tooltip
              content={compact ? <NoTooltip /> : <GoalGapTooltip goalGap={goalGap} />}
              cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
              allowEscapeViewBox={{ x: false, y: true }} wrapperStyle={{ zIndex: 20 }}
            />

            {/* The shaded shortfall: an invisible floor at min(projected,
                required), then the band on top of it. The two stack to exactly
                the requirement line, so the band never paints over the corpus
                where the plan is ahead. */}
            {hasGoals && (
              <>
                <Area type="linear" dataKey="floor" stackId="gap" stroke="none" fill="none" isAnimationActive={false} />
                <Area type="linear" dataKey="gapHeight" stackId="gap" stroke="none" fill="url(#ggGapGrad)" isAnimationActive={false} />
              </>
            )}

            <Area
              type="monotone" dataKey="projected"
              stroke="var(--chart-primary)" strokeWidth={2.5} fill="url(#ggProjGrad)"
              dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-primary)" }}
              isAnimationActive={true} animationDuration={600} animationEasing="ease-out"
            />

            {hasGoals && (
              <Line
                type="linear" dataKey="required"
                stroke="var(--chart-target)" strokeWidth={2} strokeDasharray="6 4"
                dot={false} isAnimationActive={false}
              />
            )}

            {earliestRetireAge > startAge && earliestRetireAge < windowEnd && (
              <ReferenceLine
                x={earliestRetireAge} stroke="var(--chart-target)"
                strokeDasharray="5 4" strokeOpacity={0.6}
                label={{ value: "Retire", position: refLabelPosition(earliestRetireAge, [startAge, windowEnd]), offset: 6, fill: "var(--chart-tick)", fontSize: 12 }}
              />
            )}

            {/* The year in the readout stays marked after the finger lifts. */}
            {selected && <ReferenceLine x={selected.age} stroke="var(--chart-axis)" strokeWidth={1} />}
            {selected && (
              <ReferenceDot x={selected.age} y={Math.max(0, selected.projected)} r={4}
                fill="var(--chart-primary)" stroke="var(--card-bg)" strokeWidth={2} />
            )}

            {hasGoals && (
              <Customized component={(p) => <GoalPinsCustomized {...p} goals={goals} series={series} R={layout.markerR} />} />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {!hasGoals && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-lg px-4 py-3 text-center text-help max-w-[260px]"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-sm)' }}
            >
              Add a goal to see the gap between your corpus and what you&rsquo;ll need.
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="mt-3">
          <ChartReadout hint="Tap or drag across the chart to see another age.">
            <GoalGapBreakdown d={selected} goalGap={goalGap} />
          </ChartReadout>
        </div>
      )}

      {hasGoals && (
        <div className="mt-4 text-body" style={{ color: 'var(--text-secondary)' }}>
          {/* Two verdicts, deliberately separate. allFunded is "the plan paid
              what it was charged"; coversRealCost is "the corpus stays above
              what those goals really cost by then". With future pricing off
              they can disagree, and that disagreement is the whole message. */}
          {!allFunded ? (
            <span style={{ color: 'var(--danger)' }}>
              {shortGoals.length === 1
                ? `${shortGoals[0].name} falls short by ${fmt(shortGoals[0].gap)}.`
                : `${shortGoals.length} goals fall short, by ${fmt(goalGap.totals.gap)} in total.`}
            </span>
          ) : coversRealCost ? (
            <span style={{ color: 'var(--success)' }}>
              Your corpus stays above the real cost of your goals
              {crossoverAge > series[0].age ? ` from age ${crossoverAge}.` : " throughout."}
            </span>
          ) : (
            <span style={{ color: 'var(--warning)' }}>
              Your plan funds every goal at the prices it charges, but the corpus
              dips below what those goals will really cost.
            </span>
          )}
          {!plan?.inflateGoals && goalGap.totals.inflationGap > 1 && (
            <>
              {" "}The gold line is priced up at {pricedAt.length === 1
                ? `${pricedAt[0]}%/yr` : "each goal’s own inflation rate"}; your projection
              charges {fmt(goalGap.totals.requiredToday)}, today&rsquo;s prices.
            </>
          )}
        </div>
      )}
    </Card>
  );
}
