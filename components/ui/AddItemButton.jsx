"use client";

import { Plus } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

export default function AddItemButton({ onClick, label, tone = "emerald" }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "w-full border-dashed py-3 h-auto text-xs font-semibold",
        "border-[var(--border-strong)] text-[var(--text-secondary)] bg-transparent hover:bg-[var(--surface-hover)]"
      )}
    >
      <Plus size={ICON_SIZE.sm} className="mr-1.5" /> {label}
    </Button>
  );
}
