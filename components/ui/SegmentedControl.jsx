"use client";

import { Label } from "./label";
import { cn } from "@/lib/utils";

/* One row of choices. Full width on a phone, where the segments share the
   row by the length of their labels; its natural width from sm up. It wraps
   rather than overflow, so however narrow the card it sits in, a long option
   list breaks onto a second row instead of pushing the page sideways. */
export default function SegmentedControl({ label, options, value, onChange, disabled = false }) {
  const items = options.map((o) =>
    typeof o === "string"
      ? { value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }
      : o
  );
  return (
    <div>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className={cn(
        "flex w-full flex-wrap gap-1 rounded-xl border p-1 sm:inline-flex sm:w-auto sm:max-w-full",
        "bg-[var(--surface-muted)] border-[var(--border-subtle)]",
        disabled && "opacity-50 pointer-events-none"
      )}>
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            disabled={disabled}
            aria-pressed={value === it.value}
            className={cn(
              "min-h-10 flex-auto rounded-lg px-3 py-2 text-label font-semibold transition-all duration-150 sm:px-4",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              value === it.value
                ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-sm"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
