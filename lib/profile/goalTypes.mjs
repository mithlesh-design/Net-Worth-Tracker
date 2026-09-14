/* Goal type emoji, in one place.

   These were written out twice — once in FinancialGoals (the picker) and once
   in ProjectionChart (the pins), with different escaping — and the Goal Gap
   chart would have been a third copy. Adding a goal type should not mean
   remembering three files. */

export const GOAL_EMOJIS = {
  home: "\u{1F3E0}",
  education: "\u{1F393}",
  car: "\u{1F697}",
  wedding: "\u{1F492}",
  travel: "✈️",
  retirement: "\u{1F3D6}️",
  other: "\u{1F3AF}",
};

export const GOAL_TYPES = Object.keys(GOAL_EMOJIS);

export const goalEmoji = (type) => GOAL_EMOJIS[type] ?? GOAL_EMOJIS.other;
