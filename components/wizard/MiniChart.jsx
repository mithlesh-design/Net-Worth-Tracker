"use client";

import {
  AreaChart, Area, XAxis, YAxis,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { ChartLine } from "lucide-react";
import { fmtAxis } from "@/lib/finance/format.mjs";
import { Card } from "@/components/ui/card";
import SectionHeader from "@/components/ui/SectionHeader";
import { useChartLayout } from "@/components/charts/useChartLayout.mjs";

export default function MiniChart({
  simulation, currentAge, lifeExpectancy, retirementAge,
  title = "Net Worth Projection",
}) {
  const layout = useChartLayout();
  if (!simulation?.data?.length) return null;

  return (
    <Card className="p-card">
      <SectionHeader icon={ChartLine} title={title} className="mb-4" />
      <div ref={layout.ref} className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={simulation.data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="miniNwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--chart-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="age" type="number" domain={[currentAge, lifeExpectancy]} {...layout.xTicks}
              tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--chart-tick)" }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={fmtAxis} tickMargin={layout.tickMargin}
              tick={{ fontSize: 12, fill: "var(--chart-tick)" }} width={layout.yAxisWidth} />
            {retirementAge <= lifeExpectancy && (
              <ReferenceLine x={retirementAge} stroke="var(--chart-target)" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.5} />
            )}
            <Area type="monotone" dataKey="netWorth" stroke="var(--chart-primary)" strokeWidth={2} fill="url(#miniNwGrad)"
              dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
