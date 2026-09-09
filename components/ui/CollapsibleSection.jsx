"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionCard from "./SectionCard";

/* Moved verbatim from app/page.jsx. Do not restyle. */
export default function CollapsibleSection({ title, children, defaultOpen = true, badge = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SectionCard>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
        <div className="text-[0.58rem] font-bold uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          {title}
          {badge && <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold normal-case tracking-normal" style={{ background: 'var(--badge-emerald-bg)', color: 'var(--badge-emerald-text)' }}>{badge}</span>}
        </div>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: 'var(--text-muted)' }} />
      </button>
      {open && <div className="mt-3 space-y-4">{children}</div>}
    </SectionCard>
  );
}
