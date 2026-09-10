"use client";

import { cn } from "@/lib/utils";

export default function InfoStrip({ tone = "blue", children, icon = null, className = "" }) {
  return (
    <div
      className={cn(
        "px-1 py-1.5 text-xs leading-relaxed",
        icon && "flex items-start gap-1.5",
        `text-[var(--info-${tone}-text)]`,
        className
      )}
    >
      {icon}
      <div className={cn(icon && "flex-1")}>{children}</div>
    </div>
  );
}
