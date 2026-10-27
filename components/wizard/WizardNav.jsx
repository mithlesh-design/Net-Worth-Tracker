"use client";

import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Knows nothing about step indices or how many steps there are; wizardSteps.js
   owns both. The forward action is the gold call to action; Back is a quiet
   outline beside it. Full width on a phone, where it is the thumb target.

   `locked`: the next step needs a sign-in (the results, once sign-in exists).
   The button says so with a lock, and a line under it says what happens and
   that nothing typed is lost. */
export default function WizardNav({ isFirst, isLast, nextLabel = "Continue", locked = false, onBack, onNext }) {
  return (
    <div className="flex flex-col-reverse items-stretch justify-between gap-3 pt-8 pb-2 sm:flex-row sm:items-start sm:gap-4">
      {!isFirst ? (
        <Button variant="outline" size="lg" onClick={onBack} className="gap-2">
          <ArrowLeft size={ICON_SIZE.md} />
          Back
        </Button>
      ) : (
        <div />
      )}

      {!isLast ? (
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button variant="cta" size="xl" onClick={onNext} className="w-full gap-2.5 sm:w-auto">
            {locked && <Lock size={ICON_SIZE.md} aria-hidden="true" />}
            {nextLabel}
            <ArrowRight size={ICON_SIZE.lg} />
          </Button>
          {locked && (
            <p className="text-center text-help text-[var(--text-muted)] sm:max-w-[18rem] sm:text-right">
              Log in or sign up to see your results. Everything you&rsquo;ve entered is kept.
            </p>
          )}
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
