"use client";

import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function TextField({ label, value, onChange, placeholder = "", hint = null, invalid = false }) {
  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <Input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(invalid && "border-[var(--danger-border)]")}
      />
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
