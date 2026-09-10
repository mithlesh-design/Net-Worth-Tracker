import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg px-3 py-2 text-xs leading-relaxed",
  {
    variants: {
      variant: {
        default: "bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)]",
        info: "bg-[var(--info-blue-bg)] text-[var(--info-blue-text)]",
        warning: "bg-[var(--info-amber-bg)] text-[var(--info-amber-text)]",
        danger: "bg-[var(--info-red-bg)] text-[var(--info-red-text)]",
        success: "bg-[var(--info-emerald-bg)] text-[var(--info-emerald-text)]",
        sky: "bg-[var(--info-sky-bg)] text-[var(--info-sky-text)]",
        violet: "bg-[var(--info-violet-bg)] text-[var(--info-violet-text)]",
        rose: "bg-[var(--info-rose-bg)] text-[var(--info-rose-text)]",
        subtle: "text-[var(--text-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-xs [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
