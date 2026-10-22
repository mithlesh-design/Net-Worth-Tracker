"use client";

import { TriangleAlert } from "lucide-react";
import { Alert } from "./alert";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

export default function FieldError({ findings }) {
  if (!findings || findings.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {findings.map((f, i) => (
        <Alert
          key={`${f.path}-${i}`}
          variant={f.severity === "warning" ? "warning" : "danger"}
          className="flex items-start gap-2 px-0 py-1 border-0 bg-transparent text-[0.8125rem]"
        >
          <TriangleAlert size={ICON_SIZE.xs} className="mt-0.5 shrink-0" />
          <span className="flex-1">{f.message}</span>
        </Alert>
      ))}
    </div>
  );
}
