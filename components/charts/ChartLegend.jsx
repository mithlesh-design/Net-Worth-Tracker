"use client";

import { cn } from "@/lib/utils";

/* The key to a chart, drawn in the chart's own marks: a solid line, a dashed
   line, or a ringed marker. Always shown, and on its own row above the plot,
   where it wraps on a phone instead of being hidden.

   items: [{ label, kind: "line" | "dash" | "marker", color, fill? }] */
export default function ChartLegend({ items, className = "" }) {
  return (
    <ul aria-label="Chart key"
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-help text-[var(--text-secondary)]", className)}>
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 whitespace-nowrap">
          <Swatch {...it} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function Swatch({ kind, color, fill = "transparent" }) {
  if (kind === "line") {
    return <span aria-hidden className="h-1.5 w-4 rounded-full" style={{ background: color }} />;
  }
  if (kind === "dash") {
    return <span aria-hidden className="h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: color }} />;
  }
  return <span aria-hidden className="h-3 w-3 rounded-full border-2" style={{ borderColor: color, background: fill }} />;
}
