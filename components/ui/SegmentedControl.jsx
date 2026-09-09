"use client";

/* The frequency button row from app/page.jsx, extracted with its markup
   unchanged. `options` is either a list of strings or {value,label} pairs. */
export default function SegmentedControl({ label, options, value, onChange, disabled = false }) {
  const items = options.map((o) => (typeof o === "string"
    ? { value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }
    : o));
  return (
    <div>
      {label && (
        <label className="text-[0.63rem] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className={`flex gap-1.5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
        {items.map((it) => (
          <button key={it.value} onClick={() => onChange(it.value)} disabled={disabled}
            className={`flex-1 py-1 rounded-lg text-[0.6rem] font-bold transition ${value === it.value ? "bg-emerald-500 text-white" : ""}`}
            style={value === it.value ? {} : { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
