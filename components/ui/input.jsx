import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-[var(--control-md)] w-full rounded-[10px] border px-4 text-base font-medium tabular-nums outline-none transition-all duration-150",
      "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)]",
      "placeholder:font-normal placeholder:text-[var(--input-placeholder)]",
      "shadow-[var(--shadow-xs)] hover:border-[var(--input-border-hover)]",
      "focus:border-[var(--input-border-focus)] focus:[box-shadow:var(--input-focus-ring)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
