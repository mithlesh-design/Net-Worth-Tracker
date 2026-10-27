"use client";

import { useState, useRef, useEffect } from "react";
import { TriangleAlert, ArrowUpRight, HandCoins, ChartLine } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot, Customized,
} from "recharts";
import { fmt, fmtAxis, numToWordsIndian } from "@/lib/finance/format.mjs";
import GoalIcon from "@/components/ui/GoalIcon";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/ui/SectionHeader";
import { StatGrid, StatTile } from "@/components/ui/StatGrid";
import ChartLegend from "@/components/charts/ChartLegend";
import { BreakdownRow, ChartTooltipCard, ChartReadout } from "@/components/charts/ChartBreakdown";
import { useChartLayout, useChartSelection } from "@/components/charts/useChartLayout.mjs";
import { measureText } from "@/components/charts/measureText.mjs";
import {
  stackMarkers, placeLabels, refLabelCandidates, badgeLabelCandidates,
} from "@/lib/ui/chartLabels.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";
import { useAnimatedDomain } from "./useAnimatedDomain.mjs";

/* One year of the projection: the cash flow that produced it, then what the
   net worth is made of. Shown in the tooltip, or in the readout on a phone. */
function NetWorthBreakdown({ d }) {
  const out = (v) => `\u2212${fmt(v)}`;
  /* The illiquid tier is owned property plus private equity; each is named
     for what it is, read per instrument. */
  const property = d.buckets?.property ?? 0;
  const privateEquity = d.buckets?.privateEquity ?? 0;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 mb-2">
        <span className="text-subtitle" style={{ color: 'var(--text-primary)' }}>Age {d.age} · {d.year}</span>
        {d.isRetired && <span className="text-overline uppercase" style={{ color: 'var(--warning)' }}>Retired</span>}
        {d.deficit && !d.isRetired && <span className="text-overline uppercase flex items-center gap-1" style={{ color: 'var(--danger)' }}><TriangleAlert size={ICON_SIZE.xs} />Deficit</span>}
      </div>
      <div className="text-value mb-2" style={{ color: 'var(--financial-projection)' }}>{fmt(d.netWorth)}</div>
      <div className="space-y-1">
        <BreakdownRow label="Income" value={fmt(d.income)} tone="var(--info)" />
        {d.rentalIncome > 0 && <BreakdownRow label="Rental income" value={fmt(d.rentalIncome)} tone="var(--info)" />}
        <BreakdownRow label="Expenses" value={out(d.annualExpense)} tone="var(--warning)" />
        {d.policyIncome > 0 && <BreakdownRow label="Insurance income" value={fmt(d.policyIncome)} tone="var(--info)" />}
        {d.insurancePremium > 0 && <BreakdownRow label={d.lifePremium > 0 ? "Medical premium" : "Insurance Premium"} value={out(d.insurancePremium)} tone="var(--warning)" />}
        {d.lifePremium > 0 && <BreakdownRow label="Life premium" value={out(d.lifePremium)} tone="var(--warning)" />}
        {d.totalEMI > 0 && <BreakdownRow label="Loan EMIs" value={out(d.totalEMI)} tone="var(--danger)" />}
        {d.maintenanceCost > 0 && <BreakdownRow label="Maintenance" value={out(d.maintenanceCost)} tone="var(--warning)" />}
        <BreakdownRow rule strong label="Available Cash" value={fmt(d.availableCash)}
          tone={d.availableCash < 0 ? 'var(--danger)' : 'var(--success)'} />
        <BreakdownRow label="Invested" value={`+${fmt(d.invested)}`} tone="var(--financial-projection)" />
        {d.payrollContribution > 0 && <BreakdownRow label="... from payroll" value={fmt(d.payrollContribution)} />}
        {d.contributionShortfall > 0 && <BreakdownRow label="Contribution Shortfall" value={fmt(d.contributionShortfall)} tone="var(--danger)" />}
        {d.surplusSpent > 0 && <BreakdownRow label="Surplus Spent" value={fmt(d.surplusSpent)} />}
        {d.policyMaturity > 0 && <BreakdownRow rule label="Life insurance maturity" value={`+${fmt(d.policyMaturity)}`} tone="var(--financial-positive)" />}
        {d.goalCostGross > 0 && <BreakdownRow rule label="Goals (incl. tax)" value={out(d.goalCostGross)} tone="var(--value-target)" />}
        {/* Owned property is IN net worth; a home goal's property is not. One
            "Property Assets" row covering both would imply they are treated
            alike, which is the whole thing this split exists to prevent. */}
        {property > 0 && <BreakdownRow label="Property owned" value={fmt(property)} tone="var(--value-target)" />}
        {privateEquity > 0 && <BreakdownRow label="Private equity" value={fmt(privateEquity)} tone="var(--value-target)" />}
        {d.propertyDebt > 0 && <BreakdownRow label="Property loan" value={out(d.propertyDebt)} tone="var(--danger)" />}
        {d.totalPropertyValue - property > 0 && <BreakdownRow label="Future home (not counted)" value={fmt(d.totalPropertyValue - property)} labelTone="var(--text-muted)" tone="var(--text-muted)" />}
        {d.totalLoanOutstanding - d.propertyDebt > 0 && <BreakdownRow label="Home loan (not counted)" value={fmt(d.totalLoanOutstanding - d.propertyDebt)} labelTone="var(--text-muted)" tone="var(--text-muted)" />}
        {(d.lockedNW > 0 || d.illiquidNW > 0) && (
          <BreakdownRow rule label={`Liquid / Locked${d.illiquidNW > 0 ? (privateEquity > 0 ? " / Illiquid" : " / Property") : ""}`}
            value={`${fmt(d.liquidNW)} / ${fmt(d.lockedNW)}${d.illiquidNW > 0 ? ` / ${fmt(d.illiquidNW)}` : ""}`} />
        )}
        {d.unfundedThisYear > 0 && <BreakdownRow label="Unfunded this year" value={fmt(d.unfundedThisYear)} tone="var(--danger)" />}
        <BreakdownRow label="Blended Return" value={`${Number(d.returnRate).toFixed(1)}%`} />
      </div>
    </>
  );
}

function NetWorthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return <ChartTooltipCard><NetWorthBreakdown d={payload[0].payload} /></ChartTooltipCard>;
}

/* Draws nothing: on a phone the tooltip only supplies the cursor line, and
   the year it lands on is read in the panel under the chart. */
const NoTooltip = () => null;

/* ── Annotations ──
   Everything drawn on top of the data — goal pins above the line, insurance
   payouts below it, and the labels of the Retire, Deficit and Life lines —
   laid out together, so no mark or label can land on another
   (lib/ui/chartLabels.mjs):

   - markers that would touch stack further from the line, so two goals a
     year apart, or two policies maturing in the same year, both stay visible;
   - payouts in the same year share one badge, labelled with their total;
   - each label takes the first place it fits on the chart, clear of every
     marker and every earlier label, beside its line or badge on the side with
     room. A label with nowhere to go is left out; its figure is also in the
     tooltip and in the list under the chart.

   Labels carry a halo in the card colour, so they stay legible where they
   cross the line or the grid. */
const STEM = 6;
const PAYOUT_R = 10;
const LABEL_H = 14;

/* One badge per age: two policies maturing together are one event on the
   line, and two badges there would sit on each other. */
function groupPayouts(events) {
  const byAge = new Map();
  for (const e of events) {
    if (!byAge.has(e.age)) byAge.set(e.age, []);
    byAge.get(e.age).push(e);
  }
  return [...byAge.entries()].map(([age, items]) => {
    const total = (keep) => items.filter(keep).reduce((t, e) => t + e.amount, 0);
    const maturity = total((e) => e.kind === "maturity");
    const income = total((e) => e.kind !== "maturity");
    const text = maturity > 0 && income > 0
      ? `${fmtAxis(maturity)} + ${fmtAxis(income)}/yr`
      : maturity > 0 ? `${fmtAxis(maturity)} maturity` : `${fmtAxis(income)}/yr`;
    const title = items.map((e) => `${e.owner ? `${e.owner}: ` : ""}${e.label} — ${e.kind === "maturity"
      ? `${fmt(e.amount)} at age ${e.ownerAge}`
      : `${fmt(e.amount)} a year from age ${e.ownerAge}`}`).join("\n");
    return { key: `payout-${age}`, age, text, title };
  });
}

function ChartAnnotations({ xScale, yScale, plot, projection, goals, payouts, refs, R, showPayoutText }) {
  const at = (age) => {
    const pt = projection.find((p) => p.age === age);
    if (!pt) return null;
    const cx = xScale(pt.age);
    const cy = yScale(Math.max(0, pt.netWorth));
    return isFinite(cx) && isFinite(cy) ? { cx, cy } : null;
  };

  /* Goal pins float above the line; touching ones stack upward. */
  const pins = goals.map((g) => ({ g, p: at(g.age) })).filter((m) => m.p);
  const pinYs = stackMarkers(pins.map((m) => ({ x: m.p.cx, y: m.p.cy - STEM - R })), { r: R, dir: -1 });
  pins.forEach((m, i) => { m.by = pinYs[i]; });

  /* Payout badges hang below it; touching ones stack downward. A payout in a
     year the portfolio is near zero would hang below the axis, so its badge
     starts no lower than the bottom of the plot. */
  const badges = groupPayouts(payouts).map((gr) => ({ gr, p: at(gr.age) })).filter((m) => m.p);
  const lowest = plot.top + plot.height - PAYOUT_R - 2;
  const badgeYs = stackMarkers(
    badges.map((m) => ({ x: m.p.cx, y: Math.min(m.p.cy + STEM + PAYOUT_R, lowest) })),
    { r: PAYOUT_R, dir: 1 });
  badges.forEach((m, i) => { m.by = badgeYs[i]; });

  const box = (cx, cy, r) => ({ x: cx - r, y: cy - r, w: r * 2, h: r * 2 });
  const obstacles = [
    ...pins.map((m) => box(m.p.cx, m.by, R)),
    ...badges.map((m) => box(m.p.cx, m.by, PAYOUT_R)),
  ];
  const bounds = { x: plot.left, y: plot.top, w: plot.width, h: plot.height };

  /* In priority order: the reference lines name the chart's structure, so
     they choose first; payout amounts fit around them. */
  const refLabels = refs
    .map((r) => ({ ...r, x: xScale(r.age) }))
    .filter((r) => isFinite(r.x))
    .map((r) => ({
      ...r,
      candidates: refLabelCandidates(r.x, {
        w: measureText(r.text, { weight: 500 }), h: LABEL_H,
        top: plot.top + 4, bottom: plot.top + plot.height - 4,
        rightFirst: r.x - plot.left < plot.width * 0.75,
      }),
    }));
  const payoutLabels = showPayoutText
    ? badges.map((m) => ({
        text: m.gr.text,
        candidates: badgeLabelCandidates(m.p.cx, m.by, {
          r: PAYOUT_R, w: measureText(m.gr.text, { weight: 600 }), h: LABEL_H,
        }),
      }))
    : [];
  const placed = placeLabels([...refLabels, ...payoutLabels], { bounds, obstacles });
  const halo = { stroke: "var(--card-bg)", strokeWidth: 3, paintOrder: "stroke", strokeLinejoin: "round" };

  return (
    <>
      {pins.map(({ g, p, by }) => (
        <g key={g.id}>
          <line x1={p.cx} y1={p.cy} x2={p.cx} y2={by + R} stroke="var(--chart-target)" strokeWidth={1.5} strokeOpacity={0.7} />
          <circle cx={p.cx} cy={p.cy} r={3.5} fill="var(--chart-target)" />
          <circle cx={p.cx} cy={by} r={R} fill="var(--goal-marker-fill)" stroke="var(--chart-target)" strokeWidth={1.5} />
          <foreignObject x={p.cx - R} y={by - R} width={R * 2} height={R * 2} style={{ overflow: "visible" }}>
            <div style={{ width: R * 2, height: R * 2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--chart-target)" }}>
              <GoalIcon type={g.emoji} size={R < 14 ? ICON_SIZE.xs : ICON_SIZE.sm} />
            </div>
          </foreignObject>
        </g>
      ))}

      {badges.map(({ gr, p, by }) => (
        <g key={gr.key}>
          <title>{gr.title}</title>
          <line x1={p.cx} y1={p.cy} x2={p.cx} y2={by - PAYOUT_R} stroke="var(--financial-positive)" strokeWidth={1.5} strokeOpacity={0.7} />
          <circle cx={p.cx} cy={p.cy} r={3} fill="var(--financial-positive)" />
          <circle cx={p.cx} cy={by} r={PAYOUT_R} fill="var(--bg-secondary)" stroke="var(--financial-positive)" strokeWidth={1.5} />
          <foreignObject x={p.cx - PAYOUT_R} y={by - PAYOUT_R} width={PAYOUT_R * 2} height={PAYOUT_R * 2} style={{ overflow: "visible" }}>
            <div style={{ width: PAYOUT_R * 2, height: PAYOUT_R * 2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--financial-positive)" }}>
              <HandCoins size={ICON_SIZE.xs} />
            </div>
          </foreignObject>
        </g>
      ))}

      {[...refLabels, ...payoutLabels].map((l, i) => placed[i] && (
        <text key={`label-${i}`} x={placed[i].x + 1} y={placed[i].y + LABEL_H - 3}
          fontSize={12} fontWeight={i < refLabels.length ? 500 : 600}
          fill={l.color ?? "var(--financial-positive)"} {...halo}>
          {l.text}
        </text>
      ))}
    </>
  );
}

function AnnotationsCustomized(props) {
  const xAxis = props.xAxisMap?.[Object.keys(props.xAxisMap || {})[0]];
  const yAxis = props.yAxisMap?.[Object.keys(props.yAxisMap || {})[0]];
  if (!xAxis?.scale || !yAxis?.scale || !props.offset) return null;
  return (
    <ChartAnnotations xScale={xAxis.scale} yScale={yAxis.scale} plot={props.offset}
      projection={props.projection} goals={props.goals} payouts={props.payouts}
      refs={props.refs} R={props.R} showPayoutText={props.showPayoutText} />
  );
}

export default function ProjectionChart({
  plan, simulation, age, lifeExpectancy,
  expectedXIRR, postRetireReturn, investmentStepUp, investSurplus, exitTaxRate,
  earliestRetireAge, goalPoints, policyPoints = [], household = null,
}) {
  const currentAge = age;
  const lastPoint = simulation.data[simulation.data.length - 1];
  const retirePoint = simulation.data.find((d) => d.age === earliestRetireAge);
  /* The engine flags every year that spends more than comes in, and once nobody
     is earning that is every retired year: the drawdown the plan was built
     for. Only a shortfall while someone is still working is a warning. Counted
     as one, the Deficit marker sat on the retirement line, labelled to its
     left, and read as a deficit starting a year before retirement. */
  const isDeficit = (d) => d.deficit && !d.isRetired;
  const firstDeficitAge = simulation.data.find(isDeficit)?.age;
  const constrainedYears = simulation.data.filter((d) => d.constrained || isDeficit(d)).length;
  const shortfallYears = simulation.data.filter((d) => d.contributionShortfall > 0).length;

  const rawPeak = simulation.data.reduce((max, d) => Math.max(max, d.netWorth), 0);
  const yMax = useAnimatedDomain(rawPeak * 1.1);

  const layout = useChartLayout();
  const { compact } = layout;
  /* A phone opens the readout on the retirement year: the one figure most
     people come to this chart for. */
  const retireIndex = simulation.data.findIndex((d) => d.age === earliestRetireAge);
  const selection = useChartSelection(simulation.data.length,
    retireIndex >= 0 ? retireIndex : simulation.data.length - 1);
  const selected = compact ? simulation.data[selection.index] : null;

  const domain = [currentAge, lifeExpectancy];
  /* The reference lines' labels, placed by the annotation layer. A phone
     keeps only Retire: Life is the axis's last tick, and the deficit's age is
     in the warning under the chart. */
  const refs = [
    earliestRetireAge <= lifeExpectancy && {
      age: earliestRetireAge, text: compact ? "Retire" : `Retire ${earliestRetireAge}`, color: "var(--chart-target)",
    },
    !compact && firstDeficitAge && { age: firstDeficitAge, text: "Deficit", color: "var(--chart-negative)" },
    !compact && { age: lifeExpectancy, text: `Life ${lifeExpectancy}`, color: "var(--chart-tick)" },
  ].filter(Boolean);

  const legend = [
    { label: "Net Worth", kind: "line", color: "var(--chart-primary)" },
    { label: "Retire", kind: "dash", color: "var(--chart-target)" },
    { label: "Life Exp.", kind: "dash", color: "var(--text-muted)" },
    { label: "Goals", kind: "marker", color: "var(--chart-target)", fill: "var(--goal-marker-fill)" },
    ...(policyPoints.length > 0
      ? [{ label: "Insurance payouts", kind: "marker", color: "var(--financial-positive)" }]
      : []),
  ];

  return (
    <Card className="flex flex-col gap-5 p-card">
      <SectionHeader icon={ChartLine} title="Net Worth Over Time"
        kicker={simulation.fiAge ? `FI at age ${simulation.fiAge}` : null} />
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
            {/* One person's assumptions would misdescribe a household whose
                members each carry their own; name who is in it instead. */}
            {household
              ? <>Household: {household} · each on their own return and tax assumptions</>
              : <>{expectedXIRR}% XIRR · {postRetireReturn}% post-retire · +{investmentStepUp}%/yr step-up · {exitTaxRate}% tax · {investSurplus ? "invest" : "spend"} surplus</>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {constrainedYears > 0 && (
            <span className="flex items-center gap-1.5 text-value-sm" style={{ color: 'var(--danger)' }}>
              <TriangleAlert size={ICON_SIZE.sm} /> {constrainedYears} yrs deficit
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="mb-4">
          <div className="text-overline uppercase" style={{ color: 'var(--text-muted)' }}>Net Worth at Age {lifeExpectancy}</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-value-xl tabular-nums" style={{ color: 'var(--text-primary)' }}>{lastPoint ? fmt(lastPoint.netWorth) : "\u2014"}</span>
            {lastPoint && lastPoint.netWorthRaw > simulation.openingPortfolio && (
              <span className="inline-flex items-center gap-1 text-value-sm tabular-nums" style={{ color: 'var(--success)' }}>
                <ArrowUpRight size={ICON_SIZE.sm} /> +{fmt(lastPoint.netWorthRaw - simulation.openingPortfolio)}
              </span>
            )}
            {lastPoint && lastPoint.netWorthRaw <= 0 && (
              <span className="inline-flex items-center gap-1 text-value-sm" style={{ color: 'var(--danger)' }}>
                <TriangleAlert size={ICON_SIZE.sm} /> Depleted
              </span>
            )}
          </div>
          <div className="mt-1 text-help" style={{ color: 'var(--text-muted)' }}>{lastPoint ? numToWordsIndian(Math.max(0, lastPoint.netWorthRaw)) : ""}</div>
        </div>

        <ChartLegend items={legend} className="mb-3" />

        <div ref={layout.ref} className="relative h-72 touch-pan-y sm:h-80 lg:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulation.data} margin={layout.margin} {...(compact ? selection.handlers : {})}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity="var(--gradient-start-opacity)" />
                  <stop offset="70%" stopColor="var(--chart-primary)" stopOpacity="var(--gradient-mid-opacity)" />
                  <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="age" type="number" domain={domain} {...layout.xTicks}
                tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={layout.tickMargin}
                tick={{ fontSize: 12, fill: "var(--chart-tick)" }}
                label={{ value: "Age", position: "insideBottomRight", offset: -12, fill: "var(--chart-tick)", fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={layout.tickMargin}
                tickFormatter={fmtAxis} tick={{ fontSize: 12, fill: "var(--chart-tick)" }} width={layout.yAxisWidth}
                domain={[0, Math.round(yMax)]} allowDataOverflow={false} />
              <Tooltip content={compact ? <NoTooltip /> : <NetWorthTooltip />}
                cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: true }} wrapperStyle={{ zIndex: 20 }} />

              {earliestRetireAge <= lifeExpectancy && (
                <ReferenceLine x={earliestRetireAge} stroke="var(--chart-target)" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.6} />
              )}

              <ReferenceLine x={lifeExpectancy} stroke="var(--chart-tick)" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.5} />

              {firstDeficitAge && (
                <ReferenceLine x={firstDeficitAge} stroke="var(--chart-negative)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />
              )}

              <Area type="monotone" dataKey="netWorth" stroke="var(--chart-primary)" strokeWidth={2.5} fill="url(#nwGrad)"
                dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-primary)" }}
                isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />

              {/* The year in the readout stays marked after the finger lifts. */}
              {selected && (
                <ReferenceLine x={selected.age} stroke="var(--chart-axis)" strokeWidth={1} />
              )}
              {selected && (
                <ReferenceDot x={selected.age} y={Math.max(0, selected.netWorth)} r={4}
                  fill="var(--chart-primary)" stroke="var(--card-bg)" strokeWidth={2} />
              )}

              {/* Line labels, goal pins and payouts: one layer, laid out together. */}
              <Customized component={(props) => (
                <AnnotationsCustomized {...props} projection={simulation.data}
                  goals={goalPoints} payouts={policyPoints} refs={refs}
                  R={layout.markerR} showPayoutText={!compact} />
              )} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {selected && (
          <div className="mt-3">
            <ChartReadout hint="Tap or drag across the chart to see another year.">
              <NetWorthBreakdown d={selected} />
            </ChartReadout>
          </div>
        )}

        {policyPoints.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-help" aria-label="Life insurance events">
            {policyPoints.map((e) => (
              <span key={e.key} className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <HandCoins size={ICON_SIZE.xs} style={{ color: 'var(--financial-positive)' }} />
                {e.kind === "maturity"
                  ? <>Age {e.age} &rarr; <strong style={{ color: 'var(--text-primary)' }}>{fmt(e.amount)}</strong> life insurance maturity</>
                  : <>Age {e.age}&ndash;{e.endAge} &rarr; <strong style={{ color: 'var(--text-primary)' }}>{fmt(e.amount)}</strong> a year, insurance income</>}
                {e.owner && <span style={{ color: 'var(--text-muted)' }}>({e.owner}{e.ownerAge !== e.age ? `, at ${e.ownerAge}` : ""})</span>}
              </span>
            ))}
          </div>
        )}

        {(constrainedYears > 0 || shortfallYears > 0 || simulation.depletionAge) && (
          <div className="mt-4 border-l-2 pl-4 py-2 flex items-start gap-2"
            style={{ borderColor: 'var(--danger-border)' }}>
            <TriangleAlert size={ICON_SIZE.sm} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
            <div className="text-help space-y-1" style={{ color: 'var(--danger)' }}>
              {constrainedYears > 0 && (
                <div>
                  <strong>Cash Flow Warning:</strong> {constrainedYears} year{constrainedYears > 1 ? "s" : ""} with negative cash flow.{" "}
                  {firstDeficitAge && <>Starts at age <strong>{firstDeficitAge}</strong> {"\u2014"} shortfall drawn from your portfolio.</>}
                </div>
              )}
              {shortfallYears > 0 && (
                <div>
                  Planned contributions could not be fully funded in{" "}
                  <strong>{shortfallYears}</strong> year{shortfallYears > 1 ? "s" : ""}.
                </div>
              )}
              {simulation.depletionAge && (
                <div>
                  Portfolio depleted at age <strong>{simulation.depletionAge}</strong>, with{" "}
                  <strong>{fmt(lastPoint?.cumUnfunded ?? 0)}</strong> of goals and expenses unfunded.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <StatGrid cols="grid-cols-2 sm:grid-cols-4" className="border-t border-[var(--border-subtle)] pt-6">
        <StatTile label="Peak Net Worth" value={fmt(simulation.peakNW)}
          sub={numToWordsIndian(simulation.peakNW)} tone="good" />
        <StatTile label="Corpus at Retire" value={retirePoint ? fmt(retirePoint.netWorthRaw) : "\u2014"}
          sub={retirePoint ? `${fmt(retirePoint.liquidNW)} liquid · ${fmt(retirePoint.lockedNW)} locked` : ""} tone="target" />
        <StatTile label="FI Age" value={simulation.fiAge || "\u2014"}
          sub={simulation.fiAge
            ? (simulation.fiAgeSustained === simulation.fiAge ? `${simulation.fiAge - age} yrs away`
              : simulation.fiAgeSustained ? `holds from ${simulation.fiAgeSustained}` : "not sustained")
            : "Not reached"}
          tone="projection" />
        <StatTile label={`NW at ${lifeExpectancy}`} value={lastPoint ? fmt(lastPoint.netWorth) : "\u2014"}
          sub={lastPoint && lastPoint.netWorthRaw <= 0 ? "Depleted" : ""}
          tone={lastPoint && lastPoint.netWorthRaw <= 0 ? "warn" : "projection"} />
      </StatGrid>
    </Card>
  );
}
