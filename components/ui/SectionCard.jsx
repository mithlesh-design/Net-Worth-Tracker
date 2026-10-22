"use client";

import { Card } from "./card";
import SectionHeader from "./SectionHeader";
import { cn } from "@/lib/utils";

export default function SectionCard({ children, title, icon = null, kicker = null, action = null, className = "" }) {
  return (
    <Card className={cn("p-5 sm:p-7", className)}>
      {title && (
        <SectionHeader icon={icon} title={title} kicker={kicker} action={action} className="mb-5 sm:mb-6" />
      )}
      {children}
    </Card>
  );
}
