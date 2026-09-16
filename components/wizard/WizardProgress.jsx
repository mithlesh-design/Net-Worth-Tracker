"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "./wizardSteps";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

export default function WizardProgress({ currentStep, onStepClick }) {
  return (
    <div className="max-w-[820px] mx-auto px-4 pt-5 pb-3 bg-[var(--bg-primary)]">
      <div className="flex items-center">
        {WIZARD_STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const isLast = i === WIZARD_STEPS.length - 1;
          return (
            <div key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              <button
                onClick={() => onStepClick(i)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-bold transition-all duration-200",
                    done && "bg-[var(--wizard-complete)] text-[var(--text-inverse)] shadow-sm",
                    active && "bg-[var(--wizard-active)] text-[var(--text-inverse)] shadow-md ring-4 ring-[var(--accent-soft)]",
                    !done && !active && "bg-[var(--wizard-track)] text-[var(--text-secondary)]"
                  )}
                >
                  {done ? <Check size={ICON_SIZE.sm} /> : i + 1}
                </div>
                {/* The rail is capped at 820px and the labels never wrap, so at
                    375px each step gets ~68px — "Income & Expenses" would blow
                    the layout. Short labels below the sm breakpoint. */}
                <span
                  className={cn(
                    "text-[0.6rem] font-medium leading-tight whitespace-nowrap",
                    active && "text-[var(--text-primary)] font-semibold",
                    done && "text-[var(--text-secondary)]",
                    !active && !done && "text-[var(--text-muted)]"
                  )}
                >
                  <span className="sm:hidden">{step.short}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-[2px] mx-2 mt-[-18px] rounded-full transition-colors duration-300",
                    i < currentStep
                      ? "bg-[var(--wizard-complete)]"
                      : "bg-[var(--wizard-track)]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
