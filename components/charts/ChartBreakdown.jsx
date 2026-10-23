"use client";

import { cn } from "@/lib/utils";

/* One year of a chart, broken down. The same body is shown two ways:

   - in a floating tooltip (ChartTooltipCard) where there is a pointer and
     room beside the line;
   - in a panel under the chart (ChartReadout) on a phone, where a 20-row
     tooltip was taller and wider than the chart and covered all of it.

   The chart components write the body once and pick the frame. */

/* label ············ figure. `rule` draws a hairline above the row, starting
   a new group; `strong` is for the row a group adds up to. */
export function BreakdownRow({
  label, value, tone = "var(--text-secondary)", labelTone = "var(--text-secondary)",
  strong = false, rule = false,
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", rule && "border-t pt-1")}
      style={rule ? { borderColor: "var(--border-subtle)" } : undefined}>
      <span className="min-w-0" style={{ color: labelTone }}>{label}</span>
      <span className={cn("whitespace-nowrap text-right", strong ? "font-bold" : "font-semibold")} style={{ color: tone }}>
        {value}
      </span>
    </div>
  );
}

export function ChartTooltipCard({ children }) {
  return (
    <div className="w-[260px] max-w-[300px] rounded-xl border px-4 py-3 text-help tabular-nums"
      style={{ background: "var(--card-bg)", borderColor: "var(--border-default)", boxShadow: "var(--shadow-lg)" }}>
      {children}
    </div>
  );
}

export function ChartReadout({ children, hint = null }) {
  return (
    <div className="rounded-xl border px-4 py-3 text-help tabular-nums"
      style={{ background: "var(--surface-muted)", borderColor: "var(--border-subtle)" }}>
      {children}
      {hint && <p className="mt-2 text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
