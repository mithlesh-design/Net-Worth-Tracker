/* Goal types, in one place.

   The type list and the titles were written out in several components — the
   picker, the chart pins, the funding table — with different escaping each
   time. Adding a goal type should not mean remembering three files.

   The stored field is still named `emoji` because that is what saved profiles
   carry; it holds a type key ("home"), not a character. Renaming the field
   would be a profile migration, not an icon change. The icon a type draws with
   lives in components/ui/GoalIcon.jsx — this module stays free of React so the
   finance and profile tests can import it. */

export const GOAL_TYPES = ["home", "education", "car", "wedding", "travel", "retirement", "other"];

/* The title a goal carries until someone types their own. */
export const GOAL_LABELS = {
  home: "Buy Home",
  education: "Kid's Education",
  car: "Buy Car",
  wedding: "Wedding",
  travel: "Travel",
  retirement: "Retirement",
  other: "New Goal",
};

export const goalLabel = (type) => GOAL_LABELS[type] ?? GOAL_LABELS.other;

/* Short forms for the picker, where seven chips share a row. "Buy Home" is the
   goal's title; "Home" is the type's name. */
export const GOAL_SHORT_LABELS = {
  home: "Home",
  education: "Education",
  car: "Car",
  wedding: "Wedding",
  travel: "Travel",
  retirement: "Retirement",
  other: "Other",
};

export const goalShortLabel = (type) => GOAL_SHORT_LABELS[type] ?? GOAL_SHORT_LABELS.other;

/* Names the app writes itself: every type label, plus the two placeholders
   older profiles carry — addGoal's "New Goal" and migrate's "Goal" fallback. */
const GENERATED_NAMES = new Set(
  [...Object.values(GOAL_LABELS), "Goal"].map((n) => n.toLowerCase()));

export const isGeneratedGoalName = (name) => {
  const s = String(name ?? "").trim();
  return s === "" || GENERATED_NAMES.has(s.toLowerCase());
};

/* The title a goal should carry after its type changes. The title is the
   user's to write, so it moves with the type only while it is still a name the
   app generated — "Villa in Goa" survives a switch to Car, "Buy Home" does
   not. */
export const goalNameForType = (currentName, type) =>
  isGeneratedGoalName(currentName) ? goalLabel(type) : currentName;
