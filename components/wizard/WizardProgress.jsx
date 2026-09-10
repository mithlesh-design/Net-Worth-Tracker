"use client";

import { cn } from "@/lib/utils";

const STEP_LABELS = ["About You", "Income", "Protection", "Investments", "Review"];

export default function WizardProgress({ currentStep, onStepClick }) {
  return (
    <div className="max-w-[820px] mx-auto px-4 pt-4 pb-2 bg-[var(--bg-primary)]">
      <div className="flex gap-2">
        {STEP_LABELS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <button
              key={label}
              onClick={() => onStepClick(i)}
              className="flex-1 flex flex-col items-center gap-1.5 group"
            >
              <div
                className={cn(
                  "w-full h-1 rounded-full transition-colors",
                  done && "bg-[var(--wizard-complete)] opacity-70",
                  active && "bg-[var(--wizard-active)]",
                  !done && !active && "bg-[var(--wizard-track)]"
                )}
              />
              <span
                className={cn(
                  "text-[0.6rem] font-medium leading-tight truncate max-w-full",
                  active && "text-[var(--text-primary)]",
                  done && "text-[var(--text-secondary)]",
                  !active && !done && "text-[var(--text-muted)]"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
