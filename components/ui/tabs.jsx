"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/* shadcn Tabs over Radix, on the app's own tokens. Radix supplies the tablist
   semantics and arrow-key movement between tabs, which a row of buttons would
   have to reimplement.

   The list scrolls sideways rather than wrapping: a household of several
   people must stay one row on a phone, and a wrapped tab bar reads as two
   unrelated rows of buttons. */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex w-full gap-1 overflow-x-auto border-b border-[var(--border-default)]",
      "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5",
      "text-sm font-semibold text-[var(--text-muted)] transition-colors",
      "hover:text-[var(--text-secondary)]",
      "data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--text-primary)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-t-md",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
