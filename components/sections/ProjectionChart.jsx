"use client";

import { useState, useRef, useEffect } from "react";
import { TriangleAlert, ArrowUpRight, HandCoins, ChartLine } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Customized,
} from "recharts";
import { fmt, fmtAxis, numToWordsIndian } from "@/lib/finance/format.mjs";
import GoalIcon from "@/components/ui/GoalIcon";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/ui/SectionHeader";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";
import { useAnimatedDomain } from "./useAnimatedDomain.mjs";

function NetWorthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border px-4 py-3 min-w-[240px] text-xs"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Age {d.age} · {d.year}</span>
        {d.isRetired && <span className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>Retired</span>}
        {d.deficit && !d.isRetired && <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: 'var(--danger)' }}><TriangleAlert size={ICON_SIZE.xs} />Deficit</span>}
      </div>
      <div className="text-base font-bold mb-2" style={{ color: 'var(--financial-projection)' }}>{fmt(d.netWorth)}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Income</span><span className="font-semibold" style={{ color: 'var(--info)' }}>{fmt(d.income)}</span></div>
        {d.rentalIncome > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Rental income</span><span className="font-semibold" style={{ color: 'var(--info)' }}>{fmt(d.rentalIncome)}</span></div>}
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Expenses</span><span className="font-semibold" style={{ color: 'var(--warning)' }}>{"\u2212"}{fmt(d.annualExpense)}</span></div>
        {d.policyIncome > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Insurance income</span><span className="font-semibold" style={{ color: 'var(--info)' }}>{fmt(d.policyIncome)}</span></div>}
        {d.insurancePremium > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{d.lifePremium > 0 ? "Medical premium" : "Insurance Premium"}</span><span className="font-semibold" style={{ color: 'var(--warning)' }}>{"\u2212"}{fmt(d.insurancePremium)}</span></div>}
        {d.lifePremium > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Life premium</span><span className="font-semibold" style={{ color: 'var(--warning)' }}>{"\u2212"}{fmt(d.lifePremium)}</span></div>}
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
        {d.policyMaturity > 0 && <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-subtle)' }}><span style={{ color: 'var(--text-secondary)' }}>Life insurance maturity</span><span className="font-semibold" style={{ color: 'var(--financial-positive)' }}>+{fmt(d.policyMaturity)}</span></div>}
        {d.goalCostGross > 0 && <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-subtle)' }}><span style={{ color: 'var(--text-secondary)' }}>Goals (incl. tax)</span><span className="font-semibold" style={{ color: 'var(--value-target)' }}>{"\u2212"}{fmt(d.goalCostGross)}</span></div>}
        {/* Owned property is IN net worth; a home goal's property is not. One
            "Property Assets" row covering both would imply they are treated
            alike, which is the whole thing this split exists to prevent. */}
        {d.illiquidNW > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Property owned</span><span className="font-semibold" style={{ color: 'var(--value-target)' }}>{fmt(d.illiquidNW)}</span></div>}
        {d.propertyDebt > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Property loan</span><span className="font-semibold" style={{ color: 'var(--danger)' }}>{"\u2212"}{fmt(d.propertyDebt)}</span></div>}
        {d.totalPropertyValue - d.illiquidNW > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Future home (not counted)</span><span className="font-semibold" style={{ color: 'var(--text-muted)' }}>{fmt(d.totalPropertyValue - d.illiquidNW)}</span></div>}
        {d.totalLoanOutstanding - d.propertyDebt > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Home loan (not counted)</span><span className="font-semibold" style={{ color: 'var(--text-muted)' }}>{fmt(d.totalLoanOutstanding - d.propertyDebt)}</span></div>}
        {(d.lockedNW > 0 || d.illiquidNW > 0) && (
          <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Liquid / Locked{d.illiquidNW > 0 ? " / Property" : ""}</span>
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {fmt(d.liquidNW)} / {fmt(d.lockedNW)}{d.illiquidNW > 0 ? ` / ${fmt(d.illiquidNW)}` : ""}
            </span>
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

/* Life insurance payouts: a coin badge BELOW the line (goals sit above it, so
   the two never collide at the same age) with the amount beside it — "Age 45
   → ₹X maturity" read straight off the chart. */
function PolicyOverlay({ events, projection, xScale, yScale }) {
  return (
    <>
      {events.map((e) => {
        const pt = projection.find((p) => p.age === e.age);
        if (!pt) return null;
        const cx = xScale(pt.age);
        const cy = yScale(Math.max(0, pt.netWorth));
        if (!isFinite(cx) || !isFinite(cy)) return null;
        const R = 10, STEM = 6, by = cy + STEM + R;
        const text = e.kind === "maturity" ? `${fmtAxis(e.amount)} maturity` : `${fmtAxis(e.amount)}/yr`;
        return (
          <g key={e.key}>
            <title>{`${e.owner ? `${e.owner}: ` : ""}${e.label} — ${e.kind === "maturity"
              ? `${fmt(e.amount)} at age ${e.ownerAge}`
              : `${fmt(e.amount)} a year from age ${e.ownerAge}`}`}</title>
            <line x1={cx} y1={cy} x2={cx} y2={cy + STEM} stroke="var(--financial-positive)" strokeWidth={1.5} strokeOpacity={0.7} />
            <circle cx={cx} cy={cy} r={3} fill="var(--financial-positive)" />
            <circle cx={cx} cy={by} r={R} fill="var(--bg-secondary)" stroke="var(--financial-positive)" strokeWidth={1.5} />
            <foreignObject x={cx - R} y={by - R} width={R * 2} height={R * 2} style={{ overflow: "visible" }}>
              <div style={{ width: R * 2, height: R * 2, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--financial-positive)" }}>
                <HandCoins size={ICON_SIZE.xs} />
              </div>
            </foreignObject>
            <text x={cx + R + 4} y={by + 4} fontSize={11} fontWeight={600} fill="var(--financial-positive)">{text}</text>
          </g>
        );
      })}
    </>
  );
}

function PolicyOverlayCustomized(props) {
  const xAxis = props.xAxisMap?.[Object.keys(props.xAxisMap || {})[0]];
  const yAxis = props.yAxisMap?.[Object.keys(props.yAxisMap || {})[0]];
  if (!xAxis?.scale || !yAxis?.scale || !props.events?.length) return null;
  return <PolicyOverlay events={props.events} projection={props.projection} xScale={xAxis.scale} yScale={yAxis.scale} />;
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

  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-7">
      <SectionHeader icon={ChartLine} title="Net Worth Over Time"
        kicker={simulation.fiAge ? `FI at age ${simulation.fiAge}` : null} />
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {/* One person's assumptions would misdescribe a household whose
                members each carry their own; name who is in it instead. */}
            {household
              ? <>Household: {household} · each on their own return and tax assumptions</>
              : <>{expectedXIRR}% XIRR · {postRetireReturn}% post-retire · +{investmentStepUp}%/yr step-up · {exitTaxRate}% tax · {investSurplus ? "invest" : "spend"} surplus</>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {constrainedYears > 0 && (
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--danger)' }}>
              <TriangleAlert size={ICON_SIZE.xs} /> {constrainedYears} yrs deficit
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Net Worth at Age {lifeExpectancy}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl" style={{ color: 'var(--text-primary)' }}>{lastPoint ? fmt(lastPoint.netWorth) : "\u2014"}</span>
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
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-1.5 w-4 rounded-full" style={{ background: 'var(--chart-primary)' }} />Net Worth</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: 'var(--chart-target)' }} />Retire</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: 'var(--text-muted)' }} />Life Exp.</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--chart-target)', background: 'var(--goal-marker-fill)' }} />Goals</span>
            {policyPoints.length > 0 && (
              <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--financial-positive)' }} />Insurance payouts</span>
            )}
          </div>
        </div>

        <div className="relative h-72 sm:h-80 lg:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulation.data} margin={{ top: 40, right: 15, bottom: 14, left: 5 }}>
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
                tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
                label={{ value: "Age", position: "insideBottomRight", offset: -12, fill: "var(--chart-tick)", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8}
                tickFormatter={fmtAxis} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} width={65}
                domain={[0, Math.round(yMax)]} allowDataOverflow={false} />
              <Tooltip content={<NetWorthTooltip />} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} />

              {earliestRetireAge <= lifeExpectancy && (
                <ReferenceLine x={earliestRetireAge} stroke="var(--chart-target)" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.6}
                  label={{ value: `Retire ${earliestRetireAge}`, position: "insideTopLeft", fontSize: 11, fill: "var(--chart-target)", offset: 6 }} />
              )}

              <ReferenceLine x={lifeExpectancy} stroke="var(--chart-tick)" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.5}
                label={{ value: `Life ${lifeExpectancy}`, position: "insideTopRight", fontSize: 11, fill: "var(--chart-tick)", offset: 6 }} />

              {firstDeficitAge && (
                <ReferenceLine x={firstDeficitAge} stroke="var(--chart-negative)" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5}
                  label={{ value: "Deficit", position: "insideTopRight", fontSize: 11, fill: "var(--chart-negative)" }} />
              )}

              <Area type="monotone" dataKey="netWorth" stroke="var(--chart-primary)" strokeWidth={2.5} fill="url(#nwGrad)"
                dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "var(--chart-primary)" }}
                isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />

              <Customized component={(props) => <GoalOverlayCustomized {...props} goals={goalPoints} projection={simulation.data} />} />
              <Customized component={(props) => <PolicyOverlayCustomized {...props} events={policyPoints} projection={simulation.data} />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {policyPoints.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Life insurance events">
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-5 sm:grid-cols-4" style={{ borderColor: 'var(--border-subtle)' }}>
        {[
          { label: "Peak Net Worth", value: fmt(simulation.peakNW), sub: numToWordsIndian(simulation.peakNW), color: "var(--financial-positive)" },
          { label: "Corpus at Retire", value: retirePoint ? fmt(retirePoint.netWorthRaw) : "\u2014", sub: retirePoint ? `${fmt(retirePoint.liquidNW)} liquid · ${fmt(retirePoint.lockedNW)} locked` : "", color: "var(--value-target)" },
          { label: "FI Age", value: simulation.fiAge || "\u2014", sub: simulation.fiAge ? (simulation.fiAgeSustained === simulation.fiAge ? `${simulation.fiAge - age} yrs away` : simulation.fiAgeSustained ? `holds from ${simulation.fiAgeSustained}` : "not sustained") : "Not reached", color: "var(--financial-projection)" },
          { label: `NW at ${lifeExpectancy}`, value: lastPoint ? fmt(lastPoint.netWorth) : "\u2014", sub: lastPoint && lastPoint.netWorthRaw <= 0 ? "Depleted" : "", color: lastPoint && lastPoint.netWorthRaw <= 0 ? "var(--danger)" : "var(--financial-projection)" },
        ].map((c) => (
          <div key={c.label} className="min-w-0 py-1">
            <div className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
            <div className="mt-1.5 text-xl font-bold tabular-nums" style={{ color: c.color }}>{c.value}</div>
            <div className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-muted)' }}>{c.sub}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
