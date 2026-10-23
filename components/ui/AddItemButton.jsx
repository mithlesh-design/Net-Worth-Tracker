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
        "w-full border-dashed py-3.5 h-auto text-label font-semibold",
        "border-[var(--gold-line)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--gold-soft)] hover:border-[var(--gold-rule)]"
      )}
    >
      <Plus size={ICON_SIZE.sm} className="mr-1.5" /> {label}
    </Button>
  );
}
