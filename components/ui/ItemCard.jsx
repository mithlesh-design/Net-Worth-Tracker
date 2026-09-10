"use client";

import { Card } from "./card";
import { cn } from "@/lib/utils";

export default function ItemCard({ children, className = "", tone = null }) {
  return (
    <Card
      className={cn(
        "rounded-lg p-4 space-y-3 bg-[var(--surface-muted)] border-0 shadow-none",
        className
      )}
      style={tone ? { borderLeft: `3px solid var(--info-${tone}-border)` } : undefined}
    >
      {children}
    </Card>
  );
}
