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

   `short` is the mobile label: the labels are whitespace-nowrap, so at 375px
   each step gets about 68px and the full labels overflow.

   `nextLabel` sits on the step that PRECEDES the results, which is what
   removes WizardNav's old `TOTAL_STEPS - 2` arithmetic.

   `hero` is the serif headline and subtitle in the page's left column. Width
   is no longer per step: every step shares the hero + content frame. */
export const WIZARD_STEPS = [
  {
    id: "about",
    label: "About You",
    short: "You",
    Component: StepAboutYou,
    hero: {
      title: "Let’s start with you",
      subtitle: "A clear picture today helps us plan for a stronger tomorrow.",
    },
  },
  {
    id: "income",
    label: "Income & Expenses",
    short: "Income",
    Component: StepIncomeExpenses,
    hero: {
      title: "What comes in, what goes out",
      subtitle: "Your earnings and everyday costs set the pace for everything that follows.",
    },
  },
  {
    id: "goals",
    label: "Goal Workspace",
    short: "Goals",
    Component: StepGoalWorkspace,
    hero: {
      title: "Shape your goals",
      subtitle: "What you’re saving for, and whether your current trajectory gets you there.",
    },
  },
  {
    id: "strategy",
    label: "Strategy Hub",
    short: "Strategy",
    Component: StepStrategyHub,
    hero: {
      title: "Your strategy",
      subtitle: "The assumptions driving your projection, and the portfolio behind them.",
    },
    nextLabel: "See Results",
  },
  {
    id: "review",
    label: "Review",
    short: "Review",
    Component: StepReview,
    hero: {
      title: "Your plan at a glance",
      subtitle: "Where your money goes each month, and where it takes you.",
    },
  },
];

export const STEP_COUNT = WIZARD_STEPS.length;

/* Step ids are more legible than indices at the call sites that genuinely need
   to know where they are (the Monte Carlo is scoped to the Strategy Hub, which
   is the only expensive thing in the wizard). */
export const STEP_INDEX = Object.fromEntries(WIZARD_STEPS.map((s, i) => [s.id, i]));
