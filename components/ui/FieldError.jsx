"use client";

import { AlertTriangle } from "lucide-react";
import InfoStrip from "./InfoStrip";

/* Validation findings rendered in the existing strip styling. Errors use the
   red token triad, warnings amber. No new colours. */
export default function FieldError({ findings }) {
  if (!findings || findings.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {findings.map((f, i) => (
        <InfoStrip key={`${f.path}-${i}`} tone={f.severity === "warning" ? "amber" : "red"}
          icon={<AlertTriangle size={10} className="mt-0.5 shrink-0" />}>
          {f.message}
        </InfoStrip>
      ))}
    </div>
  );
}
