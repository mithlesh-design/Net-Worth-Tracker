"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* `indicatorColor` exists because the inline background below beats any class
   passed via indicatorClassName — a caller tinting the bar by severity would
   silently get the default. */
const Progress = React.forwardRef(({ className, value, indicatorClassName, indicatorColor, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative h-1 w-full overflow-hidden rounded-full bg-[var(--wizard-track)]", className)}
    {...props}
  >
    <div
      className={cn("h-full rounded-full transition-all", indicatorClassName)}
      style={{
        width: `${value || 0}%`,
        background: indicatorColor || "var(--wizard-complete)",
      }}
    />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
