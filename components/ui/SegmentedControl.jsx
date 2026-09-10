"use client";

import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function SegmentedControl({ label, options, value, onChange, disabled = false }) {
  const items = options.map((o) =>
    typeof o === "string"
      ? { value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }
      : o
  );
  return (
    <div>
      {label && <Label className="block mb-1.5">{label}</Label>}
      <div className={cn(
        "inline-flex gap-1 rounded-lg p-1 bg-[var(--surface-muted)]",
        disabled && "opacity-50 pointer-events-none"
      )}>
        {items.map((it) => (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            disabled={disabled}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all duration-150",
              value === it.value
                ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
