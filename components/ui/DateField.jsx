"use client";

/* An <input type="date"> styled to match TextField exactly. */
export default function DateField({ label, value, onChange, max = undefined, hint = null, invalid = false }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[0.63rem] font-semibold block" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input type="date" value={value ?? ""} max={max}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: invalid ? 'var(--info-red-border)' : 'var(--border-secondary)',
          color: 'var(--text-primary)',
          colorScheme: 'inherit',
        }} />
      {hint && <p className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}
