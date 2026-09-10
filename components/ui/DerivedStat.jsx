"use client";

import { cn } from "@/lib/utils";

export default function DerivedStat({ label, value, sub = null, tone = "default" }) {
  const longSub = typeof sub === "string" && sub.length > 28;
  return (
    <div className="space-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <label className="text-xs font-medium pt-0.5 min-w-0 text-[var(--text-secondary)]">{label}</label>
        <div className="text-right min-w-0">
          <div
            className={cn(
              "text-sm font-semibold whitespace-nowrap tabular-nums",
              tone === "warn" && "text-[var(--value-negative)]",
              tone === "muted" && "text-[var(--value-muted)]",
              tone === "default" && "text-[var(--value-primary)]"
            )}
          >
            {value}
          </div>
          {sub && !longSub && (
            <div className="text-[0.6rem] mt-0.5 text-[var(--text-muted)]">{sub}</div>
          )}
        </div>
      </div>
      {sub && longSub && (
        <div className="text-[0.6rem] break-words text-[var(--text-muted)]">{sub}</div>
      )}
    </div>
  );
}
