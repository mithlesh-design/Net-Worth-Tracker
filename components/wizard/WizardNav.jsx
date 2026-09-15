"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Knows nothing about step indices or how many steps there are; wizardSteps.js
   owns both. The old "Skip this step" branch is gone with the Protection step
   itself — it was gated on plan.medical.hasCover / plan.life.hasCover, neither
   of which exists in the schema, so it was unconditionally true. Protection is
   now a collapsed card inside Income & Expenses that says on its own badge
   whether it holds anything. */
export default function WizardNav({ isFirst, isLast, nextLabel = "Continue", onBack, onNext }) {
  return (
    <div
      className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-8 pb-4 mt-2"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      {!isFirst ? (
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft size={ICON_SIZE.sm} />
          Back
        </Button>
      ) : (
        <div />
      )}

      {!isLast ? (
        <Button onClick={onNext} size="lg" className="gap-2 w-full sm:w-auto">
          {nextLabel}
          <ArrowRight size={ICON_SIZE.sm} />
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}
