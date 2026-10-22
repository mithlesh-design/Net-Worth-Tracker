"use client";

import { Card } from "./card";
import { cn } from "@/lib/utils";

export default function ItemCard({ children, className = "", tone = null }) {
  return (
    <Card
      className={cn(
        "rounded-xl p-4 sm:p-5 space-y-4 bg-[var(--surface-muted)] border border-[var(--border-subtle)] shadow-none",
        className
      )}
      style={tone ? { borderLeft: `3px solid var(--info-${tone}-border)` } : undefined}
    >
      {children}
    </Card>
  );
}
