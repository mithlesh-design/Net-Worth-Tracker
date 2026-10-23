"use client";

import { useState } from "react";
import { toWords, groupIN } from "@/lib/finance/format.mjs";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/* Label on the left, the value on the right in bold with its unit muted
   ("75 yrs", "₹ 1,37,433"), then a thin track with a gold thumb. The value is
   an editable box that reads as text until it is touched.

   `disabled` locks both the box and the track. `disabledText`, when given,
   replaces the number shown while locked, so a field that no longer applies
   says so instead of showing a stale figure. `grouped={false}` is for a
   figure that is not an amount, such as a year ("2026", never "2,026"). */
export default function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1, prefix = "", suffix = "", showWords = false, warn = false, disabled = false, disabledText = null, grouped = true }) {
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
  const fill = warn ? "var(--danger)" : "var(--slider-fill)";
  const unit = suffix.trim();

  /* What is in the box while it has focus. Outside an edit the box shows the
     value grouped the Indian way (1,37,433), so a figure can be read at a
     glance and a slider drag is always reflected. On focus it switches to the
     plain digits, which is what gets typed over.

     Held as text, not bound to the number: a typed-over zero would otherwise
     read "01000", and an emptied box would snap back to "0" mid-edit. Leading
     zeros drop as they appear; the plan still receives a number on every
     keystroke. A text box rather than type="number", because a number box
     cannot show the grouping separators. */
  const [draft, setDraft] = useState(null);
  const shown = draft ?? (grouped ? groupIN(value) : String(Number(value) || 0));
  /* The box is as wide as what it shows. `ch` is one digit (the figures are
     tabular), but a comma or point is much narrower, so counting every
     character as a digit leaves a gap between the ₹ and "1,37,433". */
  const width = [...shown].reduce((w, c) => w + (/\d/.test(c) ? 1 : 0.42), 0.35);

  const commit = (text) => {
    setDraft(text);
    onChange(Number(text) || 0);
  };
  const handleType = (e) => {
    commit(e.target.value.replace(/[^\d.-]/g, "").replace(/^(-?)0+(?=\d)/, "$1"));
  };
  /* The arrow keys a number box gave for free. */
  const handleKey = (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const next = +((Number(value) || 0) + (e.key === "ArrowUp" ? step : -step)).toFixed(6);
    commit(String(next));
  };

  return (
    <div className={cn("space-y-1.5", disabled && "opacity-60")} aria-disabled={disabled || undefined}>
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {disabled && disabledText !== null ? (
          <span className="text-value-sm text-[var(--text-secondary)]">{disabledText}</span>
        ) : (
          <div className={cn("flex shrink-0 items-baseline gap-1 tabular-nums", warn ? "text-[var(--danger)]" : "text-[var(--text-primary)]")}>
            {prefix && <span className="text-label text-[var(--text-muted)]">{prefix}</span>}
            <input
              type="text"
              inputMode="decimal"
              value={shown}
              onChange={handleType}
              onKeyDown={handleKey}
              /* Selecting on focus means the first key replaces the figure outright. */
              onFocus={(e) => { setDraft(String(value)); requestAnimationFrame(() => e.target.select()); }}
              onBlur={() => setDraft(null)}
              disabled={disabled}
              aria-label={typeof label === "string" ? label : undefined}
              /* Sized to what it shows, so the ₹ and the unit sit against the
                 figure instead of floating at the edge of a fixed box. */
              style={{ width: `${Math.max(width, 1.35)}ch`, color: "inherit" }}
              /* On a touch screen there is no hover to reveal that the
                 figure can be typed in, so it carries a faint field tint. */
              className="min-w-[2ch] rounded-md bg-transparent px-0.5 text-right text-value tabular-nums outline-none transition-colors hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)] focus:ring-2 focus:ring-[var(--gold-line)] [@media(hover:none)]:bg-[var(--surface-hover)]"
            />
            {unit && <span className="text-label text-[var(--text-muted)]">{unit}</span>}
          </div>
        )}
      </div>
      {/* The range input is a 24px band (see globals.css) with the 4px track
          drawn through its middle, so the thumb, 24px at most, stays inside
          this component and never sits on a hint below. */}
      <div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(Math.max(value, min), max)}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={typeof label === "string" ? label : undefined}
          className="block w-full"
          style={{ "--range-fill": `linear-gradient(to right, ${fill} ${pct}%, var(--slider-track-bg) ${pct}%)` }}
        />
      </div>
      {showWords && value > 0 && !disabled && (
        <p className="truncate text-help text-[var(--text-muted)]">{toWords(value)}</p>
      )}
    </div>
  );
}
