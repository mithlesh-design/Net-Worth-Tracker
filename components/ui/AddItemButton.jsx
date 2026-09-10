"use client";

import { Plus } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

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
      <Plus size={13} className="mr-1.5" /> {label}
    </Button>
  );
}
