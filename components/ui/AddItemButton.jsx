"use client";

import { Plus } from "lucide-react";

/* The dashed "Add Income Source" / "Add Goal" button from app/page.jsx,
   extracted with its markup unchanged. */
export default function AddItemButton({ onClick, label, tone = "emerald" }) {
  return (
    <button onClick={onClick}
      className="w-full rounded-xl border border-dashed py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
      style={{
        borderColor: `var(--info-${tone}-border)`,
        background: `var(--info-${tone}-bg)`,
        color: `var(--info-${tone}-text)`,
      }}>
      <Plus size={13} /> {label}
    </button>
  );
}
