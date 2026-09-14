# shadcn/ui Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace custom UI primitives with shadcn/ui equivalents while keeping existing CSS custom property tokens as the source of truth.

**Architecture:** Install shadcn/ui manually (no `npx shadcn init` — project uses JSX not TSX). Add Radix UI primitives + `cn()` utility. Rewrite each `components/ui/*.jsx` file in-place to use shadcn/Radix internals while preserving external prop interfaces so section/wizard consumers need zero changes.

**Tech Stack:** Next.js 14, Tailwind CSS 3.4, Radix UI, class-variance-authority, clsx, tailwind-merge

## Global Constraints

- Project uses `.jsx` (not TypeScript) — all new files are `.jsx`
- Path alias: `@/*` maps to project root (jsconfig.json)
- All colors come from CSS custom properties in `globals.css` — no hardcoded Tailwind color classes
- Existing prop interfaces on UI components MUST be preserved — section components import from `@/components/ui` and must not need changes
- Existing tests: `npm run check` must pass after each task
- Theme: `data-theme="light"` (default) and `data-theme="dark"` via CSS variables

## File Structure

```
lib/utils.js                          — CREATE (cn helper)
components/ui/button.jsx              — CREATE (shadcn Button)
components/ui/card.jsx                — CREATE (shadcn Card)
components/ui/input.jsx               — CREATE (shadcn Input)
components/ui/label.jsx               — CREATE (shadcn Label)
components/ui/slider.jsx              — CREATE (shadcn Slider)
components/ui/switch.jsx              — CREATE (shadcn Switch)
components/ui/collapsible.jsx         — CREATE (shadcn Collapsible)
components/ui/alert.jsx               — CREATE (shadcn Alert)
components/ui/separator.jsx           — CREATE (shadcn Separator)
components/ui/tooltip.jsx             — CREATE (shadcn Tooltip)
components/ui/dropdown-menu.jsx       — CREATE (shadcn DropdownMenu)
components/ui/progress.jsx            — CREATE (shadcn Progress)
components/ui/badge.jsx               — CREATE (shadcn Badge)
components/ui/SectionCard.jsx         — MODIFY (use Card internally)
components/ui/CollapsibleSection.jsx  — MODIFY (use Collapsible + Card)
components/ui/TextField.jsx           — MODIFY (use Input + Label)
components/ui/DateField.jsx           — MODIFY (use Input + Label)
components/ui/SliderInput.jsx         — MODIFY (use Slider + Input)
components/ui/ToggleSwitch.jsx        — MODIFY (use Switch)
components/ui/SegmentedControl.jsx    — MODIFY (improved styling via cn)
components/ui/InfoStrip.jsx           — MODIFY (use Alert)
components/ui/AddItemButton.jsx       — MODIFY (use Button)
components/ui/ItemCard.jsx            — MODIFY (use Card)
components/ui/DerivedStat.jsx         — MODIFY (use cn for styling)
components/ui/FieldError.jsx          — MODIFY (use Alert)
components/ui/YesNoField.jsx          — MODIFY (adapt to new SegmentedControl)
components/ui/index.js                — MODIFY (re-export new shadcn primitives)
components/AuthButton.jsx             — MODIFY (use Button, DropdownMenu, Input, Badge)
components/wizard/WizardNav.jsx       — MODIFY (use Button)
components/wizard/WizardProgress.jsx  — MODIFY (use Progress-like styling)
app/page.jsx                          — MODIFY (header uses Button)
app/globals.css                       — MODIFY (add shadcn base layer styles)
tailwind.config.js                    — MODIFY (add tailwindcss-animate plugin)
package.json                          — MODIFY (add dependencies)
```

---

### Task 1: Install Dependencies & Foundation

**Files:**
- Modify: `package.json`
- Create: `lib/utils.js`
- Modify: `tailwind.config.js`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `cn(...inputs)` function at `@/lib/utils`, `tailwindcss-animate` plugin active, shadcn CSS layer in globals.css

- [ ] **Step 1: Install required packages**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main
npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot @radix-ui/react-collapsible @radix-ui/react-switch @radix-ui/react-slider @radix-ui/react-tooltip @radix-ui/react-dropdown-menu @radix-ui/react-separator @radix-ui/react-label tailwindcss-animate
```

- [ ] **Step 2: Create `lib/utils.js`**

```js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Update `tailwind.config.js`**

Add `tailwindcss-animate` plugin and extend with shadcn-compatible keyframes/animations. Keep all existing config intact.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            950: "var(--brand-navy-950)",
            900: "var(--brand-navy-900)",
            800: "var(--brand-navy-800)",
            700: "var(--brand-navy-700)",
            100: "var(--brand-navy-100)",
            "050": "var(--brand-navy-050)",
          },
          gold: {
            600: "var(--brand-gold-600)",
            500: "var(--brand-gold-500)",
            400: "var(--brand-gold-400)",
            100: "var(--brand-gold-100)",
            "050": "var(--brand-gold-050)",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

- [ ] **Step 4: Add shadcn base layer to `globals.css`**

Insert this block right after the `@tailwind utilities;` line (line 3), before the existing design tokens section:

```css
@layer base {
  * {
    @apply border-[color:var(--border-default)];
  }
}
```

This ensures shadcn components that use `border` utility get the project's border color by default.

- [ ] **Step 5: Verify the build compiles**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Run existing tests**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run check
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/utils.js tailwind.config.js app/globals.css package.json package-lock.json
git commit -m "chore: install shadcn/ui foundation (Radix, CVA, cn utility, tailwindcss-animate)"
```

---

### Task 2: Create shadcn Base Primitives (Button, Card, Input, Label, Badge, Separator)

**Files:**
- Create: `components/ui/button.jsx`
- Create: `components/ui/card.jsx`
- Create: `components/ui/input.jsx`
- Create: `components/ui/label.jsx`
- Create: `components/ui/badge.jsx`
- Create: `components/ui/separator.jsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/utils`
- Produces: `Button` (with variants: default, secondary, destructive, outline, ghost, link; sizes: default, sm, lg, icon), `Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter`, `Input`, `Label`, `Badge`, `Separator` — all used by later tasks

- [ ] **Step 1: Create `components/ui/button.jsx`**

```jsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-[var(--bg-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-hover)]",
        destructive:
          "bg-[var(--button-danger-bg)] text-[var(--button-danger-text)] hover:opacity-90",
        outline:
          "border bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] border-[var(--button-secondary-border)] hover:bg-[var(--surface-hover)]",
        secondary:
          "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
        ghost:
          "hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
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
```

- [ ] **Step 2: Create `components/ui/card.jsx`**

```jsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-primary)] shadow-[var(--shadow-xs)]",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

- [ ] **Step 3: Create `components/ui/input.jsx`**

```jsx
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
```

- [ ] **Step 4: Create `components/ui/label.jsx`**

```jsx
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-xs font-medium text-[var(--text-secondary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
```

- [ ] **Step 5: Create `components/ui/badge.jsx`**

```jsx
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
```

- [ ] **Step 6: Create `components/ui/separator.jsx`**

```jsx
"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-[var(--border-default)]",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
```

- [ ] **Step 7: Verify build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add components/ui/button.jsx components/ui/card.jsx components/ui/input.jsx components/ui/label.jsx components/ui/badge.jsx components/ui/separator.jsx
git commit -m "feat: add shadcn base primitives (Button, Card, Input, Label, Badge, Separator)"
```

---

### Task 3: Create shadcn Interactive Primitives (Switch, Slider, Collapsible, Alert, Tooltip, DropdownMenu, Progress)

**Files:**
- Create: `components/ui/switch.jsx`
- Create: `components/ui/slider-primitive.jsx`
- Create: `components/ui/collapsible.jsx`
- Create: `components/ui/alert.jsx`
- Create: `components/ui/tooltip.jsx`
- Create: `components/ui/dropdown-menu.jsx`
- Create: `components/ui/progress.jsx`

**Interfaces:**
- Consumes: `cn()` from `@/lib/utils`
- Produces: `Switch`, `SliderPrimitive`, `Collapsible/CollapsibleTrigger/CollapsibleContent`, `Alert/AlertTitle/AlertDescription`, `Tooltip/TooltipTrigger/TooltipContent/TooltipProvider`, `DropdownMenu/*`, `Progress`

- [ ] **Step 1: Create `components/ui/switch.jsx`**

```jsx
"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-[var(--toggle-on-bg)] data-[state=unchecked]:bg-[var(--toggle-off-bg)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-[var(--bg-secondary)] shadow-sm ring-0 transition-transform",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = "Switch";

export { Switch };
```

- [ ] **Step 2: Create `components/ui/slider-primitive.jsx`**

Name it `slider-primitive.jsx` to avoid collision with the existing `SliderInput.jsx`.

```jsx
"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(({ className, trackColor, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[var(--slider-track-bg)]">
      <SliderPrimitive.Range
        className="absolute h-full rounded-full"
        style={{ background: trackColor || "var(--brand-navy-700)" }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--slider-thumb-border)] shadow-[var(--shadow-xs)] transition-transform hover:scale-[1.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

export { Slider };
```

- [ ] **Step 3: Create `components/ui/collapsible.jsx`**

```jsx
"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
```

- [ ] **Step 4: Create `components/ui/alert.jsx`**

```jsx
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
```

- [ ] **Step 5: Create `components/ui/tooltip.jsx`**

```jsx
"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs animate-in fade-in-0 zoom-in-95",
        "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-[var(--shadow-md)]",
        className
      )}
      {...props}
    />
  )
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
```

- [ ] **Step 6: Create `components/ui/dropdown-menu.jsx`**

```jsx
"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuContent = React.forwardRef(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1 shadow-[var(--shadow-md)] animate-in fade-in-0 zoom-in-95",
          "bg-[var(--bg-secondary)] border-[var(--border-default)] text-[var(--text-primary)]",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-2 text-xs outline-none transition-colors",
      "focus:bg-[var(--surface-hover)] text-[var(--text-secondary)]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[var(--border-default)]", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuLabel = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-bold text-[var(--text-primary)]", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
};
```

- [ ] **Step 7: Create `components/ui/progress.jsx`**

```jsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef(({ className, value, indicatorClassName, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative h-1 w-full overflow-hidden rounded-full bg-[var(--wizard-track)]", className)}
    {...props}
  >
    <div
      className={cn("h-full rounded-full transition-all", indicatorClassName)}
      style={{
        width: `${value || 0}%`,
        background: "var(--wizard-complete)",
      }}
    />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
```

- [ ] **Step 8: Verify build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds (new files are created but not yet imported anywhere).

- [ ] **Step 9: Commit**

```bash
git add components/ui/switch.jsx components/ui/slider-primitive.jsx components/ui/collapsible.jsx components/ui/alert.jsx components/ui/tooltip.jsx components/ui/dropdown-menu.jsx components/ui/progress.jsx
git commit -m "feat: add shadcn interactive primitives (Switch, Slider, Collapsible, Alert, Tooltip, DropdownMenu, Progress)"
```

---

### Task 4: Rewire Wrapper Components (SectionCard, CollapsibleSection, ItemCard, AddItemButton)

**Files:**
- Modify: `components/ui/SectionCard.jsx`
- Modify: `components/ui/CollapsibleSection.jsx`
- Modify: `components/ui/ItemCard.jsx`
- Modify: `components/ui/AddItemButton.jsx`

**Interfaces:**
- Consumes: `Card` from `./card`, `Collapsible/CollapsibleTrigger/CollapsibleContent` from `./collapsible`, `Button` from `./button`, `cn()` from `@/lib/utils`
- Produces: Same props as before — `SectionCard({ children, title, className })`, `CollapsibleSection({ title, children, defaultOpen, badge })`, `ItemCard({ children, className, tone })`, `AddItemButton({ onClick, label, tone })`

- [ ] **Step 1: Rewrite `SectionCard.jsx` to use Card**

```jsx
"use client";

import { Card, CardContent, CardTitle } from "./card";
import { cn } from "@/lib/utils";

export default function SectionCard({ children, title, className = "" }) {
  return (
    <Card className={cn("p-5", className)}>
      {title && <CardTitle className="mb-3">{title}</CardTitle>}
      {children}
    </Card>
  );
}
```

- [ ] **Step 2: Rewrite `CollapsibleSection.jsx` to use Collapsible + Card**

```jsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./collapsible";
import { cn } from "@/lib/utils";

export default function CollapsibleSection({ title, children, defaultOpen = true, badge = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full text-left">
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] flex items-center gap-2 text-[var(--text-muted)]">
              {title}
              {badge && (
                <span className="text-[0.6rem] font-medium normal-case tracking-normal text-[var(--text-subtle)]">
                  {badge}
                </span>
              )}
            </div>
            <ChevronDown
              size={14}
              className={cn(
                "transition-transform duration-200 text-[var(--text-muted)]",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

- [ ] **Step 3: Rewrite `ItemCard.jsx` to use Card**

```jsx
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
```

- [ ] **Step 4: Rewrite `AddItemButton.jsx` to use Button**

```jsx
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
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds. All section components importing `SectionCard`, `CollapsibleSection`, `ItemCard`, `AddItemButton` from `@/components/ui` should work without changes since props are unchanged.

- [ ] **Step 6: Run checks**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run check
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/ui/SectionCard.jsx components/ui/CollapsibleSection.jsx components/ui/ItemCard.jsx components/ui/AddItemButton.jsx
git commit -m "feat: rewire SectionCard, CollapsibleSection, ItemCard, AddItemButton to shadcn primitives"
```

---

### Task 5: Rewire Form Components (TextField, DateField, SliderInput, ToggleSwitch, SegmentedControl, InfoStrip)

**Files:**
- Modify: `components/ui/TextField.jsx`
- Modify: `components/ui/DateField.jsx`
- Modify: `components/ui/SliderInput.jsx`
- Modify: `components/ui/ToggleSwitch.jsx`
- Modify: `components/ui/SegmentedControl.jsx`
- Modify: `components/ui/InfoStrip.jsx`

**Interfaces:**
- Consumes: `Input` from `./input`, `Label` from `./label`, `Switch` from `./switch`, `Slider` from `./slider-primitive`, `cn()` from `@/lib/utils`
- Produces: Same props as before — `TextField({ label, value, onChange, placeholder, hint, invalid })`, `DateField({ label, value, onChange, max, hint, invalid })`, `SliderInput({ label, value, onChange, min, max, step, prefix, suffix, showWords, warn })`, `ToggleSwitch({ value, onChange, label })`, `SegmentedControl({ label, options, value, onChange, disabled })`, `InfoStrip({ tone, children, icon, className })`

- [ ] **Step 1: Rewrite `TextField.jsx`**

```jsx
"use client";

import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function TextField({ label, value, onChange, placeholder = "", hint = null, invalid = false }) {
  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <Input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(invalid && "border-[var(--danger-border)]")}
      />
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `DateField.jsx`**

```jsx
"use client";

import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function DateField({ label, value, onChange, max = undefined, hint = null, invalid = false }) {
  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <Input
        type="date"
        value={value ?? ""}
        max={max}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(invalid && "border-[var(--danger-border)]")}
        style={{ colorScheme: "inherit" }}
      />
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite `SliderInput.jsx`**

This is the most complex form component. It combines a label, number input, range slider, and optional word conversion. We keep the native `<input type="range">` for the slider since the project already has custom range styling in `globals.css` and Radix Slider would fight with those styles. We use `cn()` and the `Label` for consistency.

```jsx
"use client";

import { toWords } from "@/lib/finance/format.mjs";
import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1, prefix = "", suffix = "", showWords = false, warn = false }) {
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
  const trackColor = warn ? "var(--danger)" : "var(--brand-navy-700)";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className={cn("flex items-center text-sm font-semibold tabular-nums", warn ? "text-[var(--danger)]" : "text-[var(--text-primary)]")}>
          {prefix && <span className="mr-0.5 text-xs text-[var(--text-muted)]">{prefix}</span>}
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-20 text-right bg-transparent outline-none"
            step={step}
            style={{ color: "inherit" }}
          />
          {suffix && <span className="ml-0.5 text-xs text-[var(--text-muted)]">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${trackColor} ${pct}%, var(--slider-track-bg) ${pct}%)` }}
      />
      {showWords && value > 0 && (
        <p className="text-[0.6rem] italic truncate text-[var(--text-muted)]">{toWords(value)}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `ToggleSwitch.jsx`**

```jsx
"use client";

import { Switch } from "./switch";
import { Label } from "./label";

export default function ToggleSwitch({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <Switch checked={value} onCheckedChange={onChange} />
      <Label>{label}</Label>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `SegmentedControl.jsx`**

```jsx
"use client";

import { Label } from "./label";
import { cn } from "@/lib/utils";

export default function SegmentedControl({ label, options, value, onChange, disabled = false }) {
  const items = options.map((o) =>
    typeof o === "string"
      ? { value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }
      : o
  );
  return (
    <div>
      {label && <Label className="block mb-1">{label}</Label>}
      <div className={cn("flex gap-1.5", disabled && "opacity-50 pointer-events-none")}>
        {items.map((it) => (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            disabled={disabled}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors",
              value === it.value
                ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite `InfoStrip.jsx`**

```jsx
"use client";

import { cn } from "@/lib/utils";

export default function InfoStrip({ tone = "blue", children, icon = null, className = "" }) {
  return (
    <div
      className={cn(
        "px-1 py-1.5 text-xs leading-relaxed",
        icon && "flex items-start gap-1.5",
        `text-[var(--info-${tone}-text)]`,
        className
      )}
    >
      {icon}
      <div className={cn(icon && "flex-1")}>{children}</div>
    </div>
  );
}
```

Note: InfoStrip uses dynamic CSS variable names (`--info-${tone}-text`), which can't be fully expressed in Tailwind classes since the `tone` is runtime. We keep the dynamic `text-[var(--info-${tone}-text)]` pattern since Tailwind's JIT handles arbitrary value syntax.

- [ ] **Step 7: Verify build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Run checks**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run check
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add components/ui/TextField.jsx components/ui/DateField.jsx components/ui/SliderInput.jsx components/ui/ToggleSwitch.jsx components/ui/SegmentedControl.jsx components/ui/InfoStrip.jsx
git commit -m "feat: rewire form components to shadcn primitives (TextField, DateField, SliderInput, ToggleSwitch, SegmentedControl, InfoStrip)"
```

---

### Task 6: Update DerivedStat, FieldError, YesNoField & Barrel Export

**Files:**
- Modify: `components/ui/DerivedStat.jsx`
- Modify: `components/ui/FieldError.jsx`
- Modify: `components/ui/YesNoField.jsx`
- Modify: `components/ui/index.js`

**Interfaces:**
- Consumes: `cn()` from `@/lib/utils`, `Alert` from `./alert`, `SegmentedControl` from `./SegmentedControl`
- Produces: Same props as before. `index.js` now also re-exports shadcn primitives.

- [ ] **Step 1: Update `DerivedStat.jsx` to use `cn()`**

```jsx
"use client";

import { cn } from "@/lib/utils";

export default function DerivedStat({ label, value, sub = null, tone = "default" }) {
  const longSub = typeof sub === "string" && sub.length > 28;
  return (
    <div className="space-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <label className="text-xs font-medium pt-0.5 min-w-0 text-[var(--text-secondary)]">{label}</label>
        <div className="text-right min-w-0">
          <div
            className={cn(
              "text-sm font-semibold whitespace-nowrap tabular-nums",
              tone === "warn" && "text-[var(--value-negative)]",
              tone === "muted" && "text-[var(--value-muted)]",
              tone === "default" && "text-[var(--value-primary)]"
            )}
          >
            {value}
          </div>
          {sub && !longSub && (
            <div className="text-[0.6rem] mt-0.5 text-[var(--text-muted)]">{sub}</div>
          )}
        </div>
      </div>
      {sub && longSub && (
        <div className="text-[0.6rem] break-words text-[var(--text-muted)]">{sub}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `FieldError.jsx` to use Alert**

```jsx
"use client";

import { AlertTriangle } from "lucide-react";
import { Alert } from "./alert";
import { cn } from "@/lib/utils";

export default function FieldError({ findings }) {
  if (!findings || findings.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {findings.map((f, i) => (
        <Alert
          key={`${f.path}-${i}`}
          variant={f.severity === "warning" ? "warning" : "danger"}
          className="flex items-start gap-1.5 px-1 py-1.5 border-0 bg-transparent"
        >
          <AlertTriangle size={10} className="mt-0.5 shrink-0" />
          <span className="flex-1">{f.message}</span>
        </Alert>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `YesNoField.jsx` — no changes needed**

YesNoField wraps SegmentedControl, which was already updated. No change required since the props interface is the same. Read the file to confirm it still works.

- [ ] **Step 4: Update `index.js` barrel export**

```js
// Existing wrapper components
export { default as SectionCard } from "./SectionCard";
export { default as CollapsibleSection } from "./CollapsibleSection";
export { default as SliderInput } from "./SliderInput";
export { default as ToggleSwitch } from "./ToggleSwitch";
export { default as InfoStrip } from "./InfoStrip";
export { default as SegmentedControl } from "./SegmentedControl";
export { default as ItemCard } from "./ItemCard";
export { default as AddItemButton } from "./AddItemButton";
export { default as TextField } from "./TextField";
export { default as DateField } from "./DateField";
export { default as YesNoField } from "./YesNoField";
export { default as DerivedStat } from "./DerivedStat";
export { default as FieldError } from "./FieldError";

// shadcn primitives (available for direct use)
export { Button, buttonVariants } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
export { Input } from "./input";
export { Label } from "./label";
export { Switch } from "./switch";
export { Slider } from "./slider-primitive";
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./collapsible";
export { Alert, AlertTitle, AlertDescription } from "./alert";
export { Badge, badgeVariants } from "./badge";
export { Separator } from "./separator";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from "./dropdown-menu";
export { Progress } from "./progress";
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Run checks**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run check
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/ui/DerivedStat.jsx components/ui/FieldError.jsx components/ui/index.js
git commit -m "feat: update DerivedStat, FieldError to shadcn patterns, export all primitives from barrel"
```

---

### Task 7: Upgrade AuthButton with DropdownMenu

**Files:**
- Modify: `components/AuthButton.jsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`, `DropdownMenu/*` from `@/components/ui/dropdown-menu`, `Badge` from `@/components/ui/badge`, `Input` from `@/components/ui/input`, `Separator` from `@/components/ui/separator`, `cn()` from `@/lib/utils`
- Produces: Same props — `AuthButton({ onSaveProfile, onLoadProfile, profiles, onDeleteProfile, onRefreshProfiles, saveState })`

- [ ] **Step 1: Rewrite `AuthButton.jsx`**

Replace the manual dropdown with Radix DropdownMenu. This is a significant rewrite but the external interface stays the same.

```jsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { LogIn, LogOut, User, Save, FolderOpen, Trash2, ChevronDown, X } from "lucide-react";
import { useAppSession } from "@/components/DemoAuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function AuthButton({ onSaveProfile, onLoadProfile, profiles = [], onDeleteProfile, onRefreshProfiles, saveState = { status: "idle", message: "" } }) {
  const { data: session, status, isDemo, persisted, signOut } = useAppSession();
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 rounded-full animate-pulse bg-[var(--bg-tertiary)]" />
    );
  }

  if (!session) {
    return (
      <Button onClick={() => signIn()} size="sm" className="rounded-full gap-1.5 px-3.5 text-xs font-bold shadow-sm">
        <LogIn size={13} />
        Sign In
      </Button>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) onRefreshProfiles?.(); }}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 transition-colors shadow-sm bg-[var(--bg-secondary)] border-[var(--border-primary)]"
        >
          {user.image ? (
            <img src={user.image} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold bg-[var(--accent-soft)] text-[var(--accent)]">
              {initials}
            </div>
          )}
          <span className="text-xs font-medium max-w-[100px] truncate hidden sm:block text-[var(--text-secondary)]">
            {user.name || user.email}
          </span>
          {isDemo && (
            <Badge className="hidden sm:block text-[0.5rem] uppercase tracking-wide">Demo</Badge>
          )}
          <ChevronDown size={12} className="text-[var(--text-muted)]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* User info */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-[var(--text-primary)]">{user.name || "User"}</p>
            {isDemo && <Badge className="text-[0.5rem] uppercase tracking-wide">Demo mode</Badge>}
          </div>
          <p className="text-[0.6rem] truncate text-[var(--text-muted)]">{user.email}</p>
          {isDemo && !persisted && (
            <p className="text-[0.55rem] mt-1 text-[var(--info-red-text)]">
              This browser blocked storage, so a refresh will sign you out.
            </p>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Save Profile */}
        <DropdownMenuGroup>
          <div className="px-2 py-1.5">
            {saveState.status !== "idle" && saveState.message && (
              <Alert
                variant={saveState.status === "error" ? "danger" : "success"}
                className="mb-2 px-2.5 py-1.5 text-[0.6rem]"
              >
                {saveState.message}
              </Alert>
            )}
            {showSaveInput ? (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Profile name..."
                  className="flex-1 h-8 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" && saveName.trim()) {
                      onSaveProfile?.(saveName.trim());
                      setSaveName("");
                      setShowSaveInput(false);
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-[0.6rem]"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (saveName.trim()) {
                      onSaveProfile?.(saveName.trim());
                      setSaveName("");
                      setShowSaveInput(false);
                    }
                  }}
                >
                  Save
                </Button>
                <button onClick={() => setShowSaveInput(false)} className="text-[var(--text-muted)]">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowSaveInput(true); }}>
                <Save size={13} className="text-[var(--accent)]" />
                Save Current Settings
              </DropdownMenuItem>
            )}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Saved Profiles */}
        <DropdownMenuGroup>
          <div className="px-2 py-1.5">
            <button
              onClick={() => setProfilesOpen(!profilesOpen)}
              className="flex items-center justify-between w-full rounded-lg px-2 py-2 text-xs transition text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={13} className="text-[var(--info-blue-text)]" />
                Saved Profiles
                <Badge variant="outline" className="text-[0.55rem]">{profiles.length}</Badge>
              </span>
              <ChevronDown size={12} className={cn("transition-transform text-[var(--text-muted)]", profilesOpen && "rotate-180")} />
            </button>

            {profilesOpen && isDemo && (
              <p className="mt-1 px-2 text-[0.55rem] text-[var(--text-muted)]">
                Demo profiles are saved on this browser only.
              </p>
            )}

            {profilesOpen && (
              <div className="mt-1 max-h-48 overflow-y-auto space-y-1">
                {profiles.length === 0 ? (
                  <p className="text-[0.6rem] text-center py-3 text-[var(--text-muted)]">No saved profiles yet</p>
                ) : (
                  profiles.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 group transition bg-[var(--bg-tertiary)]"
                    >
                      <button
                        onClick={() => onLoadProfile?.(p)}
                        className="flex-1 text-left"
                      >
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{p.name}</p>
                        <p className="text-[0.55rem] text-[var(--text-muted)]">
                          {new Date(p.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteProfile?.(p.id); }}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition p-1 text-[var(--text-muted)]"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onSelect={() => signOut()}
          className="text-[var(--text-secondary)] focus:bg-[var(--info-red-bg)]"
        >
          <LogOut size={13} className="text-rose-400" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run checks**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run check
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/AuthButton.jsx
git commit -m "feat: upgrade AuthButton to use shadcn DropdownMenu, Button, Badge, Alert"
```

---

### Task 8: Upgrade WizardNav & WizardProgress with Button

**Files:**
- Modify: `components/wizard/WizardNav.jsx`
- Modify: `components/wizard/WizardProgress.jsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`, `Progress` from `@/components/ui/progress`, `cn()` from `@/lib/utils`
- Produces: Same props — `WizardNav({ currentStep, onBack, onNext, canSkipProtection })`, `WizardProgress({ currentStep, onStepClick })`

- [ ] **Step 1: Rewrite `WizardNav.jsx`**

```jsx
"use client";

import { Button } from "@/components/ui/button";

const TOTAL_STEPS = 5;

export default function WizardNav({ currentStep, onBack, onNext, canSkipProtection }) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOTAL_STEPS - 1;

  let nextLabel = "Continue";
  if (currentStep === 2 && canSkipProtection) nextLabel = "Skip this step";
  if (currentStep === TOTAL_STEPS - 2) nextLabel = "See Results";

  return (
    <div
      className="flex items-center justify-between gap-4 pt-8 pb-4"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      {!isFirst ? (
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
      ) : (
        <div />
      )}

      {!isLast ? (
        <Button onClick={onNext} size="lg">
          {nextLabel}
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `WizardProgress.jsx`**

```jsx
"use client";

import { cn } from "@/lib/utils";

const STEP_LABELS = ["About You", "Income", "Protection", "Investments", "Review"];

export default function WizardProgress({ currentStep, onStepClick }) {
  return (
    <div className="max-w-[820px] mx-auto px-4 pt-4 pb-2 bg-[var(--bg-primary)]">
      <div className="flex gap-2">
        {STEP_LABELS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <button
              key={label}
              onClick={() => onStepClick(i)}
              className="flex-1 flex flex-col items-center gap-1.5 group"
            >
              <div
                className={cn(
                  "w-full h-1 rounded-full transition-colors",
                  done && "bg-[var(--wizard-complete)] opacity-70",
                  active && "bg-[var(--wizard-active)]",
                  !done && !active && "bg-[var(--wizard-track)]"
                )}
              />
              <span
                className={cn(
                  "text-[0.6rem] font-medium leading-tight truncate max-w-full",
                  active && "text-[var(--text-primary)]",
                  done && "text-[var(--text-secondary)]",
                  !active && !done && "text-[var(--text-muted)]"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update header button in `app/page.jsx`**

Find the theme toggle button in `app/page.jsx` (around line 257-264) and replace with shadcn Button:

Add this import near the top of `app/page.jsx` (after existing imports):
```jsx
import { Button } from "@/components/ui/button";
```

Replace the theme toggle `<button>` with:
```jsx
<Button
  variant="ghost"
  size="icon"
  onClick={toggleTheme}
  className="w-9 h-9 text-[var(--text-muted)]"
  aria-label="Toggle theme"
>
  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
</Button>
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Run checks**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run check
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/wizard/WizardNav.jsx components/wizard/WizardProgress.jsx app/page.jsx
git commit -m "feat: upgrade WizardNav, WizardProgress, and header to shadcn Button"
```

---

### Task 9: Final Verification & Cleanup

**Files:**
- No new files

- [ ] **Step 1: Full build**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run build
```

Expected: Build succeeds with zero errors.

- [ ] **Step 2: Full test suite**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run check
```

Expected: All tests pass.

- [ ] **Step 3: Dev server smoke test**

```bash
cd /Users/macmini/Desktop/net-worth-tracker-main && npm run dev
```

Open `http://localhost:3000` in a browser. Verify:
- Wizard renders with proper styling
- Theme toggle works (light ↔ dark)
- All form fields (sliders, inputs, toggles, segmented controls) are interactive
- Collapsible sections expand/collapse
- Auth button dropdown opens and shows menu items
- Charts render correctly
- No console errors

- [ ] **Step 4: Verify no unused old CSS**

Check that no inline `style={{}}` references to `var(--card-bg)`, `var(--text-primary)`, etc. remain in the UI primitives. All styling should now use Tailwind classes with `cn()`. Section components may still use inline styles for their own domain-specific styling — that's fine.

- [ ] **Step 5: Commit any cleanup**

```bash
git add -A
git commit -m "chore: final shadcn integration cleanup and verification"
```
