"use client";

import { cn } from "@/lib/utils";

/* A person's initial in a circle. Monochrome by design: people are told apart
   by name, never by colour, so nothing here needs a legend. */
export default function PersonAvatar({ label, className }) {
  const initial = String(label ?? "").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]",
        className
      )}
    >
      {initial}
    </span>
  );
}
