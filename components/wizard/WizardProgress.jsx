"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "./wizardSteps";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* The stepper: navy circle with a gold ring for where you are, navy with a
   gold check for what is done, white with a grey numeral for what is next.

   Equal columns, so the circles are evenly spaced however long a label is,
   and each connector is a hairline from one circle's edge to the next. */
export default function WizardProgress({ currentStep, onStepClick }) {
  return (
    <nav aria-label="Planner steps" className="w-full max-w-[640px]">
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${WIZARD_STEPS.length}, minmax(0, 1fr))` }}>
        {WIZARD_STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const isLast = i === WIZARD_STEPS.length - 1;
          return (
            <li key={step.id} className="relative flex justify-center">
              <button
                type="button"
                onClick={() => onStepClick(i)}
                aria-current={active ? "step" : undefined}
                className="group relative z-[1] flex flex-col items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-all duration-200 sm:h-10 sm:w-10",
                    (done || active) && "text-white",
                    !done && !active && "border group-hover:border-[var(--gold-rule)]"
                  )}
                  style={
                    active
                      ? { background: "var(--wizard-active)", boxShadow: "0 0 0 3px var(--wizard-active-ring), 0 6px 16px -4px rgba(10, 35, 66, 0.45)" }
                      : done
                        ? { background: "var(--wizard-complete)" }
                        : { background: "var(--wizard-upcoming)", borderColor: "var(--wizard-upcoming-border)", color: "var(--wizard-upcoming-text)" }
                  }
                >
                  {done ? <Check size={ICON_SIZE.md} style={{ color: "var(--gold-rule)" }} /> : i + 1}
                </span>
                {/* Short labels below sm: at 375px each step gets ~68px and
                    "Income & Expenses" would not fit. */}
                <span
                  className={cn(
                    "whitespace-nowrap text-xs leading-tight sm:text-[0.8125rem]",
                    active ? "font-semibold" : "font-medium"
                  )}
                  style={{ color: active ? "var(--text-primary)" : "var(--text-muted)" }}
                >
                  <span className="sm:hidden">{step.short}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </button>
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute top-[18px] h-px transition-colors duration-300 left-[calc(50%+24px)] right-[calc(-50%+24px)] sm:top-5 sm:left-[calc(50%+28px)] sm:right-[calc(-50%+28px)]"
                  style={{ background: i < currentStep ? "var(--wizard-complete)" : "var(--wizard-track)" }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
