"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import WizardProgress from "./WizardProgress";
import WizardNav from "./WizardNav";
import StepHero from "./StepHero";
import BrandTagline from "./BrandTagline";
import { WIZARD_STEPS, STEP_COUNT } from "./wizardSteps";

/* The page frame every step shares:

     stepper (centred) ··························· brand tagline
     ┌ hero ┐  ┌ step content ──────────────────────────────┐
     │      │  │ cards                                       │
     │ ♞    │  │                          Back   [Continue →]│
     └──────┘  └─────────────────────────────────────────────┘

   The hero is a fixed-width column from lg up and stacks above the content
   below it. Dashboard steps lay their own cards out inside the content
   column, side by side only from 2xl, where there is room. */
export default function WizardShell(props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [animating, setAnimating] = useState(false);
  const mounted = useRef(false);

  const goTo = useCallback((step) => {
    if (step < 0 || step >= STEP_COUNT || step === currentStep) return;
    setDirection(step > currentStep ? "forward" : "back");
    setAnimating(true);
    setCurrentStep(step);
  }, [currentStep]);

  /* A new step starts at the top of the page, stepper and headline in view.
     Not on first load: the page is already there, and scrolling it would hide
     the header the moment the planner opens. */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (animating) {
      const t = setTimeout(() => setAnimating(false), 240);
      return () => clearTimeout(t);
    }
  }, [currentStep, animating]);

  const step = WIZARD_STEPS[currentStep];
  const StepComponent = step.Component;

  const animClass = animating
    ? direction === "forward"
      ? "wizard-step-enter"
      : "wizard-step-enter-back"
    : "wizard-step-active";

  /* Spread rather than hand-forwarding each step's props. The old switch
     listed them per case, which is how `canSkipProtection` came to read
     plan.medical.hasCover — a field that has never existed in the schema —
     without anything catching it. Every step destructures exactly what it
     consumes, so the contract is documented at the consumer, where it is
     checkable. Cost is nil: nothing here is memoised and setField
     structuredClones the plan, so the whole tree re-renders on every edit
     regardless. */
  return (
    <div className="relative z-[1] flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1520px] px-4 pt-6 sm:px-8 lg:pt-8">
        <div className="relative flex justify-center">
          <WizardProgress currentStep={currentStep} onStepClick={goTo} />
          <BrandTagline className="absolute right-0 top-1 hidden xl:flex" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1520px] flex-1 px-4 pb-12 pt-8 sm:px-8 lg:pt-12">
        <div className="grid gap-7 lg:grid-cols-[clamp(240px,22vw,340px)_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          <StepHero key={step.id} hero={step.hero} />
          <div className={`min-w-0 ${animClass}`}>
            <StepComponent
              {...props}
              currentStep={currentStep}
            />
            <WizardNav
              isFirst={currentStep === 0}
              isLast={currentStep === STEP_COUNT - 1}
              nextLabel={step.nextLabel ?? "Continue"}
              onBack={() => goTo(currentStep - 1)}
              onNext={() => goTo(currentStep + 1)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
