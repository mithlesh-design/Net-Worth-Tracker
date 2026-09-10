"use client";

import { toWords } from "@/lib/finance/format.mjs";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1, prefix = "", suffix = "", showWords = false, warn = false }) {
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
  const trackColor = warn ? "var(--danger)" : "var(--brand-navy-700)";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className={cn("flex items-center text-sm font-semibold tabular-nums", warn ? "text-[var(--danger)]" : "text-[var(--text-primary)]")}>
          {prefix && <span className="mr-0.5 text-xs text-[var(--text-muted)]">{prefix}</span>}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-20 text-right bg-transparent outline-none"
            step={step}
            style={{ color: "inherit" }}
          />
          {suffix && <span className="ml-0.5 text-xs text-[var(--text-muted)]">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${trackColor} ${pct}%, var(--slider-track-bg) ${pct}%)` }}
      />
      {showWords && value > 0 && (
        <p className="text-[0.6rem] italic truncate text-[var(--text-muted)]">{toWords(value)}</p>
      )}
    </div>
  );
}
