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
