"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "./card";
import SectionHeader from "./SectionHeader";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./collapsible";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* A SectionCard that folds. `badge` (a count or an amount) sits in the
   header's kicker slot, so a closed card still says what it holds. */
export default function CollapsibleSection({ title, icon = null, children, defaultOpen = true, badge = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-5 sm:p-7">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--card-bg)]">
            <SectionHeader
              icon={icon}
              title={title}
              titleAs="span"
              kicker={badge}
              action={
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                  style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>
                  <ChevronDown size={ICON_SIZE.md}
                    className={cn("transition-transform duration-200", open && "rotate-180")} />
                </span>
              }
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-5 space-y-6 sm:mt-6">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
