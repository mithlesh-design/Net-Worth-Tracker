"use client";

/* Moved verbatim from app/page.jsx. Do not restyle. */
export default function SectionCard({ children, title, className = "" }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${className}`}
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', boxShadow: '0 1px 2px var(--shadow-color)' }}>
      {title && <div className="text-[0.58rem] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--text-secondary)' }}>{title}</div>}
      {children}
    </div>
  );
}
