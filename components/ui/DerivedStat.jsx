"use client";

/* A read-only computed figure. Visually distinct from SliderInput so a derived
   total is never mistaken for something the user is expected to type. */
export default function DerivedStat({ label, value, sub = null, tone = "default" }) {
  const color = tone === "warn" ? 'var(--info-red-text)'
    : tone === "muted" ? 'var(--text-secondary)'
    : 'var(--text-primary)';
  /* A long caption goes on its own line below rather than being forced into the
     right-hand column, which at 375px pushed the card past the viewport. */
  const longSub = typeof sub === "string" && sub.length > 28;
  return (
    <div className="space-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <label className="text-[0.63rem] font-semibold pt-0.5 min-w-0" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <div className="text-right min-w-0">
          <div className="text-xs font-bold whitespace-nowrap" style={{ color }}>{value}</div>
          {sub && !longSub && (
            <div className="text-[0.55rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>
          )}
        </div>
      </div>
      {sub && longSub && (
        <div className="text-[0.55rem] break-words" style={{ color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}
