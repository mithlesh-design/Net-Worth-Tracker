"use client";

import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function DateField({ label, value, onChange, max = undefined, hint = null, invalid = false }) {
  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <Input
        type="date"
        value={value ?? ""}
        max={max}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(invalid && "border-[var(--danger-border)]")}
        style={{ colorScheme: "inherit" }}
      />
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
