"use client";

import StepAboutYou from "./steps/StepAboutYou";
import StepIncomeExpenses from "./steps/StepIncomeExpenses";
import StepGoalWorkspace from "./steps/StepGoalWorkspace";
import StepStrategyHub from "./steps/StepStrategyHub";
import StepReview from "./steps/StepReview";

/* The only place the wizard's shape is written down.

   This used to live in three places that had to agree: TOTAL_STEPS in
   WizardShell, a second TOTAL_STEPS in WizardNav, and the length of a
   STEP_LABELS array in WizardProgress. Adding or reordering a step is now a
   one-line edit here.

   `short` is the mobile label: the progress rail is 820px wide and the labels
   are whitespace-nowrap, so at 375px each step gets about 68px and the full
   labels overflow.

   `nextLabel` sits on the step that PRECEDES the results, which is what
   removes WizardNav's old `TOTAL_STEPS - 2` arithmetic. */
export const WIZARD_STEPS = [
  {
    id: "about",
    label: "About You",
    short: "You",
    Component: StepAboutYou,
    maxWidth: "max-w-[820px]",
  },
  {
    id: "income",
    label: "Income & Expenses",
    short: "Income",
    Component: StepIncomeExpenses,
    maxWidth: "max-w-4xl",
  },
  {
    id: "goals",
    label: "Goal Workspace",
    short: "Goals",
    Component: StepGoalWorkspace,
    maxWidth: "max-w-6xl",
  },
  {
    id: "strategy",
    label: "Strategy Hub",
    short: "Strategy",
    Component: StepStrategyHub,
    maxWidth: "max-w-5xl",
    nextLabel: "See Results",
  },
  {
    id: "review",
    label: "Review",
    short: "Review",
    Component: StepReview,
    maxWidth: "max-w-6xl",
  },
];

export const STEP_COUNT = WIZARD_STEPS.length;

/* Step ids are more legible than indices at the call sites that genuinely need
   to know where they are (the Monte Carlo is scoped to the Strategy Hub, which
   is the only expensive thing in the wizard). */
export const STEP_INDEX = Object.fromEntries(WIZARD_STEPS.map((s, i) => [s.id, i]));
