"use client";

import { useState } from "react";
import { toWords } from "@/lib/finance/format.mjs";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/* `disabled` locks both the box and the track. `disabledText`, when given,
   replaces the number shown while locked, so a field that no longer applies
   says so instead of showing a stale figure. */
export default function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1, prefix = "", suffix = "", showWords = false, warn = false, disabled = false, disabledText = null }) {
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
  const trackColor = warn ? "var(--danger)" : "var(--brand-navy-700)";

  /* What is in the box while it has focus. A number input bound straight to
     the numeric value keeps a typed-over zero: "0" + "1000" reads "01000", and
     React will not rewrite it because 01000 === 1000. It also snaps an emptied
     box back to "0" mid-edit. Holding the text here lets the box be empty while
     typing and drops leading zeros as they appear; the plan still receives a
     number on every keystroke. Outside an edit the box shows the value, so a
     slider drag is always reflected. */
  const [draft, setDraft] = useState(null);

  const handleType = (e) => {
    const text = e.target.value.replace(/^(-?)0+(?=\d)/, "$1");
    setDraft(text);
    onChange(Number(text) || 0);
  };
  return (
    <div className={cn("space-y-1", disabled && "opacity-60")} aria-disabled={disabled || undefined}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {disabled && disabledText !== null ? (
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{disabledText}</span>
        ) : (
        <div className={cn("flex items-center text-sm font-semibold tabular-nums", warn ? "text-[var(--danger)]" : "text-[var(--text-primary)]")}>
          {prefix && <span className="mr-0.5 text-xs text-[var(--text-muted)]">{prefix}</span>}
          <input
            type="number"
            value={draft ?? value}
            onChange={handleType}
            /* Selecting on focus means the first key replaces a 0 outright. */
            onFocus={(e) => { setDraft(String(value)); e.target.select(); }}
            onBlur={() => setDraft(null)}
            disabled={disabled}
            className="w-20 text-right bg-transparent outline-none"
            step={step}
            style={{ color: "inherit" }}
          />
          {suffix && <span className="ml-0.5 text-xs text-[var(--text-muted)]">{suffix}</span>}
        </div>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn("w-full h-1.5 rounded-full appearance-none", disabled ? "cursor-not-allowed" : "cursor-pointer")}
        style={{ background: `linear-gradient(to right, ${trackColor} ${pct}%, var(--slider-track-bg) ${pct}%)` }}
      />
      {showWords && value > 0 && !disabled && (
        <p className="text-[0.6rem] italic truncate text-[var(--text-muted)]">{toWords(value)}</p>
      )}
    </div>
  );
}
