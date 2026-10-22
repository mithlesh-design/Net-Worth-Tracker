"use client";

import { cn } from "@/lib/utils";

/* A read-only figure: label left, value right in bold, an optional note
   under the value (or under both when it is too long to sit beside). */
export default function DerivedStat({ label, value, sub = null, tone = "default" }) {
  const longSub = typeof sub === "string" && sub.length > 28;
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 pt-0.5 text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        <div className="min-w-0 text-right">
          <div
            className={cn(
              "whitespace-nowrap text-base font-bold tabular-nums",
              tone === "warn" && "text-[var(--value-negative)]",
              tone === "muted" && "text-[var(--value-muted)]",
              tone === "default" && "text-[var(--value-primary)]"
            )}
          >
            {value}
          </div>
          {sub && !longSub && (
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">{sub}</div>
          )}
        </div>
      </div>
      {sub && longSub && (
        <div className="break-words text-xs text-[var(--text-muted)]">{sub}</div>
      )}
    </div>
  );
}
