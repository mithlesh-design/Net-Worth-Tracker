import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        /* Navy in light, gold in dark: in-card actions (Add Goal, Save). */
        default:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-hover)] shadow-sm hover:shadow-md",
        /* The gold call to action. One per screen: the step's forward move. */
        cta:
          "[background:var(--cta-bg)] hover:[background:var(--cta-bg-hover)] text-[var(--cta-text)] font-bold tracking-[0.01em] shadow-[var(--cta-shadow)]",
        destructive:
          "bg-[var(--button-danger-bg)] text-[var(--button-danger-text)] hover:opacity-90",
        outline:
          "border bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] border-[var(--button-secondary-border)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]",
        secondary:
          "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
        ghost:
          "hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3 text-[0.8125rem]",
        lg: "h-12 px-6 text-[0.9375rem]",
        xl: "h-[52px] px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
