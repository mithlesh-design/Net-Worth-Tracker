"use client";

import { toWords } from "@/lib/finance/format.mjs";

/* Moved verbatim from app/page.jsx. Do not restyle.
   `warn` was defined but never passed in v0; it is now used by the validation
   layer to turn the track red on an offending field. */
export default function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1, prefix = "", suffix = "", showWords = false, warn = false }) {
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
  const trackColor = warn ? "#ef4444" : "#22c55e";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[0.63rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <div className={`flex items-center rounded-lg px-2 py-1 border text-xs font-bold ${warn ? "" : ""}`}
          style={warn
            ? { background: 'var(--info-red-bg)', borderColor: 'var(--info-red-border)', color: 'var(--info-red-text)' }
            : { background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }
          }>
          {prefix && <span className="mr-0.5 text-[0.6rem]" style={{ color: 'var(--text-secondary)' }}>{prefix}</span>}
          <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-20 text-right bg-transparent outline-none" step={step} style={{ color: 'var(--text-primary)' }} />
          {suffix && <span className="ml-0.5 text-[0.6rem]" style={{ color: 'var(--text-secondary)' }}>{suffix}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${trackColor} ${pct}%, var(--slider-track-bg) ${pct}%)` }} />
      {showWords && value > 0 && <p className="text-[0.55rem] italic truncate" style={{ color: 'var(--text-secondary)' }}>{toWords(value)}</p>}
    </div>
  );
}
