"use client";

import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* The brand callout: a tinted panel with a small filled icon disc. Three
   meanings, so three looks — a note (gold), information (navy) and a problem
   (red). Older tone names map onto the nearest of the three, so every call
   site keeps working. Bold text inside a note picks up the gold, as the
   "Current age: 37" figure does in the reference. */
const NOTE = { bg: "--callout-gold-bg", border: "--callout-gold-border", text: "--callout-gold-text", iconBg: "--callout-gold-icon-bg", strong: "--gold-text", Icon: Info };
const INFO = { bg: "--callout-navy-bg", border: "--callout-navy-border", text: "--callout-navy-text", iconBg: "--callout-navy-icon-bg", strong: "--text-primary", Icon: Info };
const PROBLEM = { bg: "--callout-danger-bg", border: "--callout-danger-border", text: "--callout-danger-text", iconBg: "--callout-danger-icon-bg", strong: "--danger", Icon: TriangleAlert };

const TONES = {
  amber: NOTE,
  gold: NOTE,
  blue: INFO,
  sky: INFO,
  violet: INFO,
  emerald: INFO,
  red: PROBLEM,
  rose: PROBLEM,
};

export default function InfoStrip({ tone = "blue", children, icon = null, className = "" }) {
  const t = TONES[tone] ?? INFO;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        "[&_strong]:font-bold [&_strong]:text-[var(--callout-strong)]",
        className
      )}
      style={{
        background: `var(${t.bg})`,
        borderColor: `var(${t.border})`,
        color: `var(${t.text})`,
        "--callout-strong": `var(${t.strong})`,
      }}
    >
      <span aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: `var(${t.iconBg})` }}>
        {icon ?? <t.Icon size={ICON_SIZE.xs} />}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
