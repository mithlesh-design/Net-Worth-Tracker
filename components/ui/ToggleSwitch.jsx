"use client";

/* Moved verbatim from app/page.jsx. Do not restyle. */
export default function ToggleSwitch({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${value ? "bg-emerald-500" : ""}`}
        style={!value ? { background: 'var(--toggle-off-bg)' } : {}}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0.5"}`}
          style={{ background: 'var(--bg-secondary)' }} />
      </button>
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}
