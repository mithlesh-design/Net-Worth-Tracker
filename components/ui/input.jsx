import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors",
      "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)]",
      "placeholder:text-[var(--input-placeholder)]",
      "focus:border-[var(--input-border-focus)] focus:[box-shadow:var(--input-focus-ring)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    style={{ minHeight: "var(--control-md)" }}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
