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
