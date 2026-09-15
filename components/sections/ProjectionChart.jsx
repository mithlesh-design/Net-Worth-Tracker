"use client";

import { useState, useRef, useEffect } from "react";
import { TriangleAlert, ArrowUpRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Customized,
} from "recharts";
import { fmt, fmtAxis, numToWordsIndian } from "@/lib/finance/format.mjs";
import GoalIcon from "@/components/ui/GoalIcon";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";
import { useAnimatedDomain } from "./useAnimatedDomain.mjs";

function NetWorthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="backdrop-blur-md rounded-xl border px-4 py-3 min-w-[240px] text-xs"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-black" style={{ color: 'var(--text-primary)' }}>Age {d.age} · {d.year}</span>
        {d.isRetired && <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>Retired</span>}
        {d.deficit && <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: 'var(--danger)' }}><TriangleAlert size={ICON_SIZE.xs} />Deficit</span>}
      </div>
      <div className="text-base font-black mb-2" style={{ color: 'var(--financial-projection)' }}>{fmt(d.netWorth)}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Income</span><span className="font-semibold" style={{ color: 'var(--info)' }}>{fmt(d.income)}</span></div>
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Expenses</span><span className="font-semibold" style={{ color: 'var(--warning)' }}>{"\u2212"}{fmt(d.annualExpense)}</span></div>
        {d.insurancePremium > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Insurance Premium</span><span className="font-semibold" style={{ color: 'var(--warning)' }}>{"\u2212"}{fmt(d.insurancePremium)}</span></div>}
        {d.totalEMI > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Loan EMIs</span><span className="font-semibold" style={{ color: 'var(--danger)' }}>{"\u2212"}{fmt(d.totalEMI)}</span></div>}
        {d.maintenanceCost > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Maintenance</span><span className="font-semibold" style={{ color: 'var(--warning)' }}>{"\u2212"}{fmt(d.maintenanceCost)}</span></div>}
        <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-subtle)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Available Cash</span>
          <span className="font-bold" style={{ color: d.availableCash < 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(d.availableCash)}</span>
        </div>
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Invested</span><span className="font-semibold" style={{ color: 'var(--financial-projection)' }}>+{fmt(d.invested)}</span></div>
        {d.payrollContribution > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>... from payroll</span><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt(d.payrollContribution)}</span></div>}
        {d.contributionShortfall > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Contribution Shortfall</span><span className="font-semibold" style={{ color: 'var(--danger)' }}>{fmt(d.contributionShortfall)}</span></div>}
        {d.surplusSpent > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Surplus Spent</span><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt(d.surplusSpent)}</span></div>}
        {d.goalCostGross > 0 && <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-subtle)' }}><span style={{ color: 'var(--text-secondary)' }}>Goals (incl. tax)</span><span className="font-semibold" style={{ color: 'var(--financial-target)' }}>{"\u2212"}{fmt(d.goalCostGross)}</span></div>}
        {d.totalPropertyValue > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Property Assets</span><span className="font-semibold" style={{ color: 'var(--financial-target)' }}>{fmt(d.totalPropertyValue)}</span></div>}
        {d.totalLoanOutstanding > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Loans</span><span className="font-semibold" style={{ color: 'var(--danger)' }}>{"\u2212"}{fmt(d.totalLoanOutstanding)}</span></div>}
        {d.lockedNW > 0 && (
          <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Liquid / Locked</span>
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt(d.liquidNW)} / {fmt(d.lockedNW)}</span>
          </div>
        )}
        {d.unfundedThisYear > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Unfunded this year</span><span className="font-semibold" style={{ color: 'var(--danger)' }}>{fmt(d.unfundedThisYear)}</span></div>}
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Blended Return</span><span style={{ color: 'var(--text-secondary)' }}>{Number(d.returnRate).toFixed(1)}%</span></div>
      </div>
    </div>
  );
}

function GoalOverlay({ goals, projection, xScale, yScale }) {
  return (
    <>
      {goals.map((goal) => {
        const pt = projection.find((p) => p.age === goal.age);
        if (!pt) return null;
        const cx = xScale(pt.age);
        const cy = yScale(Math.max(0, pt.netWorth));
        if (!isFinite(cx) || !isFinite(cy)) return null;
        const R = 14, STEM = 6, by = cy - STEM - R;
        return (
          <g key={goal.id}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - STEM} stroke="var(--chart-target)" strokeWidth={1.5} strokeOpacity={0.7} />
            <circle cx={cx} cy={cy} r={3.5} fill="var(--chart-target)" />
            <circle cx={cx} cy={by} r={R} fill="var(--goal-marker-fill)" stroke="var(--chart-target)" strokeWidth={1.5} />
            <foreignObject x={cx - R} y={by - R} width={R * 2} height={R * 2} style={{ overflow: "visible" }}>
              <div style={{ width: R * 2, height: R * 2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--chart-target)" }}>
                <GoalIcon type={goal.emoji} size={ICON_SIZE.sm} />
              </div>
            </foreignObject>
          </g>
        );
      })}
    </>
  );
}

function GoalOverlayCustomized(props) {
  const xAxis = props.xAxisMap?.[Object.keys(props.xAxisMap || {})[0]];
  const yAxis = props.yAxisMap?.[Object.keys(props.yAxisMap || {})[0]];
  if (!xAxis?.scale || !yAxis?.scale) return null;
  return <GoalOverlay goals={props.goals} projection={props.projection} xScale={xAxis.scale} yScale={yAxis.scale} />;
}

export default function ProjectionChart({
  plan, simulation, age, lifeExpectancy,
  expectedXIRR, postRetireReturn, investmentStepUp, investSurplus, exitTaxRate,
  earliestRetireAge, goalPoints,
}) {
  const currentAge = age;
  const lastPoint = simulation.data[simulation.data.length - 1];
  const retirePoint = simulation.data.find((d) => d.age === earliestRetireAge);
  const firstDeficitAge = simulation.data.find((d) => d.deficit)?.age;
  const constrainedYears = simulation.data.filter((d) => d.constrained || d.deficit).length;
  const shortfallYears = simulation.data.filter((d) => d.contributionShortfall > 0).length;

  const rawPeak = simulation.data.reduce((max, d) => Math.max(max, d.netWorth), 0);
  const yMax = useAnimatedDomain(rawPeak * 1.1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>Net Worth Over Time</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {expectedXIRR}% XIRR · {postRetireReturn}% post-retire · +{investmentStepUp}%/yr step-up · {exitTaxRate}% tax · {investSurplus ? "invest" : "spend"} surplus
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {simulation.fiAge && (
            <span className="text-sm font-semibold" style={{ color: 'var(--financial-target)' }}>FI at Age {simulation.fiAge}</span>
          )}
          {constrainedYears > 0 && (
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--danger)' }}>
              <TriangleAlert size={ICON_SIZE.xs} /> {constrainedYears} yrs deficit
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl p-4 sm:p-5 border"
        style={{ background: 'var(--chart-surface)', borderColor: 'var(--border-default)' }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Net Worth at Age {lifeExpectancy}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-2xl font-black tabular-nums sm:text-3xl" style={{ color: 'var(--text-primary)' }}>{lastPoint ? fmt(lastPoint.netWorth) : "\u2014"}</span>
              {lastPoint && lastPoint.netWorthRaw > simulation.openingPortfolio && (
                <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--success)' }}>
                  <ArrowUpRight size={ICON_SIZE.sm} /> +{fmt(lastPoint.netWorthRaw - simulation.openingPortfolio)}
                </span>
              )}
              {lastPoint && lastPoint.netWorthRaw <= 0 && (
                <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                  <TriangleAlert size={ICON_SIZE.sm} /> Depleted
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs italic" style={{ color: 'var(--text-muted)' }}>{lastPoint ? numToWordsIndian(Math.max(0, lastPoint.netWorthRaw)) : ""}</div>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full" style={{ background: 'var(--chart-primary)' }} />Net Worth</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: 'var(--chart-target)' }} />Retire</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: 'var(--text-muted)' }} />Life Exp.</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--chart-target)', background: 'var(--goal-marker-fill)' }} />Goals</span>
          </div>
        </div>

        <div className="relative h-72 sm:h-80 lg:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulation.data} margin={{ top: 40, right: 15, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity="var(--gradient-start-opacity)" />
                  <stop offset="70%" stopColor="var(--chart-primary)" stopOpacity="var(--gradient-mid-opacity)" />
                  <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="age" type="number" domain={[currentAge, lifeExpectancy]}
                tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8}
                tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
                label={{ value: "Age", position: "insideBottomRight", offset: -4, fill: "var(--chart-tick)", fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8}
                tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: "var(--chart-tick)" }} width={65}
                domain={[0, Math.round(yMax)]} allowDataOverflow={false} />
              <Tooltip content={<NetWorthTooltip />} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} />

              {earliestRetireAge <= lifeExpectancy && (
                <ReferenceLine x={earliestRetireAge} stroke="var(--chart-target)" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.6}
                  label={{ value: `Retire ${earliestRetireAge}`, position: "insideTopLeft", fontSize: 9, fill: "var(--chart-target)", offset: 6 }} />
              )}

              <ReferenceLine x={lifeExpectancy} stroke="var(--chart-tick)" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.5}
                label={{ value: `Life ${lifeExpectancy}`, position: "insideTopRight", fontSize: 9, fill: "var(--chart-tick)", offset: 6 }} />

              {firstDeficitAge && (
                <ReferenceLine x={firstDeficitAge} stroke="var(--chart-negative)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5}
                  label={{ value: "Deficit", position: "insideTopRight", fontSize: 8, fill: "var(--chart-negative)" }} />
              )}

              <Area type="monotone" dataKey="netWorth" stroke="var(--chart-primary)" strokeWidth={2.5} fill="url(#nwGrad)"
                dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-primary)" }}
                isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />

              <Customized component={(props) => <GoalOverlayCustomized {...props} goals={goalPoints} projection={simulation.data} />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {(constrainedYears > 0 || shortfallYears > 0 || simulation.depletionAge) && (
          <div className="mt-4 border-l-2 pl-4 py-2 flex items-start gap-2"
            style={{ borderColor: 'var(--danger-border)' }}>
            <TriangleAlert size={ICON_SIZE.sm} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
            <div className="text-xs space-y-1" style={{ color: 'var(--danger)' }}>
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
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Peak Net Worth", value: fmt(simulation.peakNW), sub: numToWordsIndian(simulation.peakNW), color: "var(--financial-positive)" },
          { label: "Corpus at Retire", value: retirePoint ? fmt(retirePoint.netWorthRaw) : "\u2014", sub: retirePoint ? `${fmt(retirePoint.liquidNW)} liquid · ${fmt(retirePoint.lockedNW)} locked` : "", color: "var(--financial-target)" },
          { label: "FI Age", value: simulation.fiAge || "\u2014", sub: simulation.fiAge ? (simulation.fiAgeSustained === simulation.fiAge ? `${simulation.fiAge - age} yrs away` : simulation.fiAgeSustained ? `holds from ${simulation.fiAgeSustained}` : "not sustained") : "Not reached", color: "var(--financial-projection)" },
          { label: `NW at ${lifeExpectancy}`, value: lastPoint ? fmt(lastPoint.netWorth) : "\u2014", sub: lastPoint && lastPoint.netWorthRaw <= 0 ? "Depleted" : "", color: lastPoint && lastPoint.netWorthRaw <= 0 ? "var(--danger)" : "var(--financial-projection)" },
        ].map((c) => (
          <div key={c.label} className="py-2">
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
            <div className="mt-1 text-lg font-bold tabular-nums" style={{ color: c.color }}>{c.value}</div>
            <div className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
