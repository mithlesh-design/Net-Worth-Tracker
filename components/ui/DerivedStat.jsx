"use client";

/* A read-only computed figure. Visually distinct from SliderInput so a derived
   total is never mistaken for something the user is expected to type. */
export default function DerivedStat({ label, value, sub = null, tone = "default" }) {
  const color = tone === "warn" ? 'var(--info-red-text)'
    : tone === "muted" ? 'var(--text-secondary)'
    : 'var(--text-primary)';
  return (
    <div className="flex items-start justify-between gap-2">
      <label className="text-[0.63rem] font-semibold pt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="text-right shrink-0">
        <div className="text-xs font-bold" style={{ color }}>{value}</div>
        {sub && <div className="text-[0.55rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}
