import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6rem] font-bold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent-soft)] text-[var(--accent)]",
        success: "bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]",
        warning: "bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)]",
        danger: "bg-[var(--badge-red-bg)] text-[var(--badge-red-text)]",
        info: "bg-[var(--badge-blue-bg)] text-[var(--badge-blue-text)]",
        outline: "border border-[var(--border-default)] text-[var(--text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
