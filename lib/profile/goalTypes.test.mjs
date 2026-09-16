import { test } from "node:test";
import assert from "node:assert/strict";
import { GOAL_TYPES, GOAL_LABELS, goalLabel, goalShortLabel, isGeneratedGoalName, goalNameForType } from "./goalTypes.mjs";

/* Changing a goal's type used to leave the title behind: the seeded "Buy Home"
   goal stayed titled "Buy Home" after being switched to Car or Travel. The
   title follows the type, but only while it is still a name the app wrote. */

test("every goal type has a label", () => {
  for (const t of GOAL_TYPES) assert.equal(typeof GOAL_LABELS[t], "string");
  assert.equal(goalLabel("home"), "Buy Home");
  assert.equal(goalLabel("nonsense"), GOAL_LABELS.other);
});

test("a seeded name is retitled to the new type", () => {
  assert.equal(goalNameForType("Buy Home", "car"), goalLabel("car"));
  assert.equal(goalNameForType("Kid's Education", "travel"), goalLabel("travel"));
});

test("the add-goal and migration placeholders are retitled too", () => {
  assert.equal(goalNameForType("New Goal", "wedding"), goalLabel("wedding"));
  assert.equal(goalNameForType("Goal", "retirement"), goalLabel("retirement"));
});

test("a blank title gets the type's label", () => {
  assert.equal(goalNameForType("", "home"), "Buy Home");
  assert.equal(goalNameForType("   ", "home"), "Buy Home");
  assert.equal(goalNameForType(undefined, "home"), "Buy Home");
});

test("a name the user typed survives a type change", () => {
  assert.equal(goalNameForType("Villa in Goa", "car"), "Villa in Goa");
  assert.equal(goalNameForType("Buy Home for Mum", "car"), "Buy Home for Mum");
  assert.equal(isGeneratedGoalName("Villa in Goa"), false);
});

test("matching a generated name ignores case and surrounding space", () => {
  assert.equal(goalNameForType("  buy home  ", "car"), goalLabel("car"));
});

test("switching type twice keeps following the type", () => {
  const once = goalNameForType("Buy Home", "car");
  assert.equal(goalNameForType(once, "travel"), goalLabel("travel"));
});

test("every goal type has a short label for the picker", () => {
  for (const t of GOAL_TYPES) assert.equal(typeof goalShortLabel(t), "string");
  assert.equal(goalShortLabel("home"), "Home");
  assert.equal(goalShortLabel("nonsense"), "Other");
});

/* Read as source rather than imported: node's test runner cannot load JSX, and
   the failure this guards against — adding a goal type and forgetting its icon,
   so the picker silently falls back to Target — is visible in the text. */
test("every goal type is wired to an icon in GoalIcon.jsx", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../../components/ui/GoalIcon.jsx", import.meta.url), "utf8");
  const map = src.slice(src.indexOf("const ICONS = {"), src.indexOf("};", src.indexOf("const ICONS = {")));
  const imported = src.slice(0, src.indexOf("from \"lucide-react\""));
  for (const t of GOAL_TYPES) {
    const entry = new RegExp(`\\b${t}:\\s*([A-Z][A-Za-z0-9]*)`).exec(map);
    assert.ok(entry, `goal type "${t}" has no icon in GoalIcon.jsx`);
    assert.ok(imported.includes(entry[1]), `icon ${entry[1]} for "${t}" is not imported`);
  }
});
