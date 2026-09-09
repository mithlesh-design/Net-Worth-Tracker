"use client";

/* The bordered text input from the "New Income" draft in app/page.jsx,
   extracted with its markup unchanged. */
export default function TextField({ label, value, onChange, placeholder = "", hint = null, invalid = false }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[0.63rem] font-semibold block" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: invalid ? 'var(--info-red-border)' : 'var(--border-secondary)',
          color: 'var(--text-primary)',
        }} />
      {hint && <p className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}
