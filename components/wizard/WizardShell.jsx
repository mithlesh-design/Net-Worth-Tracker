"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import WizardProgress from "./WizardProgress";
import WizardNav from "./WizardNav";
import { WIZARD_STEPS, STEP_COUNT } from "./wizardSteps";

export default function WizardShell(props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [animating, setAnimating] = useState(false);
  const contentRef = useRef(null);

  const goTo = useCallback((step) => {
    if (step < 0 || step >= STEP_COUNT || step === currentStep) return;
    setDirection(step > currentStep ? "forward" : "back");
    setAnimating(true);
    setCurrentStep(step);
  }, [currentStep]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (animating) {
      const t = setTimeout(() => setAnimating(false), 200);
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
    <div className="flex flex-col flex-1 min-h-0">
      <WizardProgress currentStep={currentStep} onStepClick={goTo} />

      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className={`${step.maxWidth} mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-1 ${animClass}`}>
          <StepComponent {...props} currentStep={currentStep} />
          <WizardNav
            isFirst={currentStep === 0}
            isLast={currentStep === STEP_COUNT - 1}
            nextLabel={step.nextLabel ?? "Continue"}
            onBack={() => goTo(currentStep - 1)}
            onNext={() => goTo(currentStep + 1)}
          />
        </div>
      </div>
    </div>
  );
}
