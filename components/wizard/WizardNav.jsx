"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Knows nothing about step indices or how many steps there are; wizardSteps.js
   owns both. The forward action is the gold call to action; Back is a quiet
   outline beside it. Full width on a phone, where it is the thumb target. */
export default function WizardNav({ isFirst, isLast, nextLabel = "Continue", onBack, onNext }) {
  return (
    <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-8 pb-2 sm:flex-row sm:items-center sm:gap-4">
      {!isFirst ? (
        <Button variant="outline" size="lg" onClick={onBack} className="gap-2">
          <ArrowLeft size={ICON_SIZE.md} />
          Back
        </Button>
      ) : (
        <div />
      )}

      {!isLast ? (
        <Button variant="cta" size="xl" onClick={onNext} className="w-full gap-2.5 sm:w-auto">
          {nextLabel}
          <ArrowRight size={ICON_SIZE.lg} />
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}
