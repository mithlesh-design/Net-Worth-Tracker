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
