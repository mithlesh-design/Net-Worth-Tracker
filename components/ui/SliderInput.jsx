"use client";

import { useState } from "react";
import { toWords } from "@/lib/finance/format.mjs";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/* Label on the left, the value on the right in bold with its unit muted
   ("75 yrs"), then a thin track with a gold thumb. The value is an editable
   box that reads as text until it is touched.

   `disabled` locks both the box and the track. `disabledText`, when given,
   replaces the number shown while locked, so a field that no longer applies
   says so instead of showing a stale figure. */
export default function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1, prefix = "", suffix = "", showWords = false, warn = false, disabled = false, disabledText = null }) {
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
  const fill = warn ? "var(--danger)" : "var(--slider-fill)";
  const unit = suffix.trim();

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
    <div className={cn("space-y-1.5", disabled && "opacity-60")} aria-disabled={disabled || undefined}>
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {disabled && disabledText !== null ? (
          <span className="text-sm font-semibold text-[var(--text-secondary)]">{disabledText}</span>
        ) : (
          <div className={cn("flex items-baseline gap-1 tabular-nums", warn ? "text-[var(--danger)]" : "text-[var(--text-primary)]")}>
            {prefix && <span className="text-sm font-medium text-[var(--text-muted)]">{prefix}</span>}
            <input
              type="number"
              value={draft ?? value}
              onChange={handleType}
              /* Selecting on focus means the first key replaces a 0 outright. */
              onFocus={(e) => { setDraft(String(value)); e.target.select(); }}
              onBlur={() => setDraft(null)}
              disabled={disabled}
              aria-label={typeof label === "string" ? label : undefined}
              className="w-24 rounded-md bg-transparent px-1 text-right text-lg font-bold outline-none transition-colors hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)] focus:ring-2 focus:ring-[var(--gold-line)] sm:w-28"
              step={step}
              style={{ color: "inherit" }}
            />
            {unit && <span className="text-sm font-medium text-[var(--text-muted)]">{unit}</span>}
          </div>
        )}
      </div>
      {/* Padded by the thumb's overhang (20px thumb on a 4px track), so the
          thumb stays inside this component and never sits on a hint below. */}
      <div className="py-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(Math.max(value, min), max)}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={typeof label === "string" ? label : undefined}
          className={cn("block w-full appearance-none rounded-full", disabled ? "cursor-not-allowed" : "cursor-pointer")}
          style={{ background: `linear-gradient(to right, ${fill} ${pct}%, var(--slider-track-bg) ${pct}%)` }}
        />
      </div>
      {showWords && value > 0 && !disabled && (
        <p className="truncate text-xs italic text-[var(--text-muted)]">{toWords(value)}</p>
      )}
    </div>
  );
}
