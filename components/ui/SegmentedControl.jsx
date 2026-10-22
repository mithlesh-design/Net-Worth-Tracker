"use client";

import { Label } from "./label";
import { cn } from "@/lib/utils";

/* `wrap` lets a longer option list break onto a second row on a phone rather
   than clip its last option; the default stays one inline row. */
export default function SegmentedControl({ label, options, value, onChange, disabled = false, wrap = false }) {
  const items = options.map((o) =>
    typeof o === "string"
      ? { value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }
      : o
  );
  return (
    <div>
      {label && <Label className="mb-2 block">{label}</Label>}
      <div className={cn(
        wrap ? "flex flex-wrap" : "inline-flex",
        "gap-1 rounded-xl border p-1 bg-[var(--surface-muted)] border-[var(--border-subtle)]",
        disabled && "opacity-50 pointer-events-none"
      )}>
        {items.map((it) => (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            disabled={disabled}
            className={cn(
              wrap ? "grow" : "flex-1",
              "rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150",
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
