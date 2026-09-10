"use client";

import {
  AreaChart, Area, XAxis, YAxis,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { fmtAxis } from "@/lib/finance/format.mjs";

export default function MiniChart({ simulation, currentAge, lifeExpectancy, retirementAge }) {
  if (!simulation?.data?.length) return null;

  return (
    <div className="rounded-xl p-4 mt-2 border"
      style={{ background: 'var(--chart-surface)', borderColor: 'var(--border-default)' }}>
      <div className="text-xs font-medium mb-2"
        style={{ color: 'var(--text-muted)' }}>
        Preview: Net Worth Projection
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={simulation.data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="miniNwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="age" type="number" domain={[currentAge, lifeExpectancy]}
              tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: "var(--chart-tick)" }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={fmtAxis}
              tick={{ fontSize: 9, fill: "var(--chart-tick)" }} width={50} />
            {retirementAge <= lifeExpectancy && (
              <ReferenceLine x={retirementAge} stroke="var(--chart-target)" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.5} />
            )}
            <Area type="monotone" dataKey="netWorth" stroke="var(--chart-primary)" strokeWidth={2} fill="url(#miniNwGrad)"
              dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
