"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import WizardProgress from "./WizardProgress";
import WizardNav from "./WizardNav";
import StepAboutYou from "./steps/StepAboutYou";
import StepIncomeExpenses from "./steps/StepIncomeExpenses";
import StepProtection from "./steps/StepProtection";
import StepInvestments from "./steps/StepInvestments";
import StepGoalsReview from "./steps/StepGoalsReview";

const TOTAL_STEPS = 5;

export default function WizardShell(props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState("forward");
  const [animating, setAnimating] = useState(false);
  const contentRef = useRef(null);

  const goTo = useCallback((step) => {
    if (step < 0 || step >= TOTAL_STEPS || step === currentStep) return;
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

  const canSkipProtection = currentStep === 2 && !props.plan.medical?.hasCover && !props.plan.life?.hasCover;

  const stepContent = (() => {
    switch (currentStep) {
      case 0:
        return (
          <StepAboutYou
            plan={props.plan} setField={props.setField} findingsFor={props.findingsFor}
            age={props.age} ageIsDerived={props.ageIsDerived}
            currentAge={props.currentAge} setCurrentAge={props.setCurrentAge}
            lifeExpectancy={props.lifeExpectancy} setLifeExpectancy={props.setLifeExpectancy}
          />
        );
      case 1:
        return (
          <StepIncomeExpenses
            plan={props.plan} incomes={props.incomes}
            updateIncome={props.updateIncome} addIncome={props.addIncome}
            removeIncome={props.removeIncome} findingsFor={props.findingsFor}
            totalMonthlyIncome={props.totalMonthlyIncome}
            setField={props.setField} premiums={props.premiums}
            homeGoalAge={props.homeGoalAge} simulation={props.simulation}
          />
        );
      case 2:
        return (
          <StepProtection
            plan={props.plan} setField={props.setField} findingsFor={props.findingsFor}
          />
        );
      case 3:
        return (
          <StepInvestments
            plan={props.plan} setField={props.setField} findingsFor={props.findingsFor}
            cplan={props.cplan} makeId={props.makeId} simulation={props.simulation}
            totalHoldings={props.totalHoldings}
            monthlyInvestment={props.monthlyInvestment} setMonthlyInvestment={props.setMonthlyInvestment}
            expectedXIRR={props.expectedXIRR} setExpectedXIRR={props.setExpectedXIRR}
            investmentStepUp={props.investmentStepUp} setInvestmentStepUp={props.setInvestmentStepUp}
            investSurplus={props.investSurplus} setInvestSurplus={props.setInvestSurplus}
            postRetireReturn={props.postRetireReturn} setPostRetireReturn={props.setPostRetireReturn}
            ratesAreCustom={props.ratesAreCustom} blendedNow={props.blendedNow}
            resetAllRates={props.resetAllRates} earliestRetireAge={props.earliestRetireAge}
          />
        );
      case 4:
        return (
          <StepGoalsReview
            plan={props.plan} goals={props.goals}
            addGoal={props.addGoal} removeGoal={props.removeGoal}
            updateGoal={props.updateGoal} findingsFor={props.findingsFor}
            age={props.age} lifeExpectancy={props.lifeExpectancy}
            cplan={props.cplan} premiums={props.premiums}
            totalHoldings={props.totalHoldings} simulation={props.simulation}
            totalMonthlyIncome={props.totalMonthlyIncome}
            expectedXIRR={props.expectedXIRR} postRetireReturn={props.postRetireReturn}
            investmentStepUp={props.investmentStepUp} investSurplus={props.investSurplus}
            exitTaxRate={props.exitTaxRate} earliestRetireAge={props.earliestRetireAge}
            goalPoints={props.goalPoints}
          />
        );
      default:
        return null;
    }
  })();

  const animClass = animating
    ? direction === "forward"
      ? "wizard-step-enter"
      : "wizard-step-enter-back"
    : "wizard-step-active";

  const maxWidth = currentStep === 4 ? "max-w-6xl" : currentStep === 1 || currentStep === 3 ? "max-w-4xl" : "max-w-[820px]";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <WizardProgress currentStep={currentStep} onStepClick={goTo} />

      <div className="flex-1 overflow-y-auto" ref={contentRef}>
        <div className={`${maxWidth} mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-1 ${animClass}`}>
          {stepContent}
          <WizardNav
            currentStep={currentStep}
            onBack={() => goTo(currentStep - 1)}
            onNext={() => goTo(currentStep + 1)}
            canSkipProtection={canSkipProtection}
          />
        </div>
      </div>
    </div>
  );
}
