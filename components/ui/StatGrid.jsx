"use client";

import { cn } from "@/lib/utils";

const TONES = {
  default: "var(--value-primary)",
  good: "var(--value-positive)",
  warn: "var(--value-negative)",
  muted: "var(--value-muted)",
  target: "var(--value-target)",
  projection: "var(--financial-projection)",
};

/* A row of headline figures: small uppercase label, the figure, a note.

   Each tile spans three rows of the grid's SUBGRID, so every label, figure
   and note in a row shares one track: when "Planned Contributions" wraps to
   two lines the figures beside it still sit on the same line instead of
   stepping down. `cols` is the Tailwind column classes for each breakpoint.

   A figure never breaks ("₹22.81 / Cr"): it stays on one line, and the
   fluid value-lg role keeps it inside a half-width tile on a 320px phone. */
export function StatGrid({ children, cols = "grid-cols-2 sm:grid-cols-3", className = "" }) {
  return (
    <div className={cn("grid gap-x-4 gap-y-6 sm:gap-x-6", cols, className)}>
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub = null, tone = "default" }) {
  return (
    <div className="row-span-3 grid min-w-0 grid-rows-subgrid gap-y-1.5">
      <div className="self-end text-overline uppercase text-[var(--text-muted)]">{label}</div>
      <div className="whitespace-nowrap text-value-lg tabular-nums" style={{ color: TONES[tone] ?? TONES.default }}>
        {value}
      </div>
      <div className="truncate text-help text-[var(--text-muted)]" title={typeof sub === "string" ? sub : undefined}>
        {sub}
      </div>
    </div>
  );
}
