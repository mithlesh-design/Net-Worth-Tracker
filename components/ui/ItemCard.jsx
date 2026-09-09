"use client";

/* The `rounded-xl border p-3 space-y-3` item card used for income sources and
   goals in app/page.jsx, extracted with its markup unchanged. */
export default function ItemCard({ children, className = "", tone = null }) {
  const style = tone
    ? { background: `var(--info-${tone}-bg)`, borderColor: `var(--info-${tone}-border)` }
    : { background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' };
  return (
    <div className={`rounded-xl border p-3 space-y-3 ${className}`} style={style}>
      {children}
    </div>
  );
}
