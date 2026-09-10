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
      {label && <Label className="block mb-1">{label}</Label>}
      <div className={cn("flex gap-1.5", disabled && "opacity-50 pointer-events-none")}>
        {items.map((it) => (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            disabled={disabled}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors",
              value === it.value
                ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
