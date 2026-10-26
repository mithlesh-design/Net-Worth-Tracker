/* ═══════════════════════════════════════════════════════════════════════════
   FIRST RUN

   The plan a new visitor starts from, and the test of whether the current
   plan has moved away from it. The Home control (the header logo) asks this
   before it resets anything: an untouched plan goes straight home, a changed
   one is confirmed first.

   The v0 first-run profile through the migration chain, with two choices a
   NEW user gets that a migrated v0 profile does not: goals priced in future
   rupees, and only the entered SIP invested (see the notes on inflateGoals and
   investSurplus in schema.mjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import { migrate } from "./migrate.mjs";
import { FIRST_RUN_V0 } from "./schema.mjs";

export const firstRunPlan = () => ({
  ...migrate(FIRST_RUN_V0), inflateGoals: true, investSurplus: false,
});

/* Structural equality that ignores key order: a plan reloaded from the local
   draft passes back through migrate(), which can rebuild objects with their
   keys in a different order but the same contents. */
export function sameData(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => sameData(v, b[i]));
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && sameData(a[k], b[k]));
}

/* True once anything in the plan differs from the first-run plan: a typed
   name, a moved slider, an added or deleted goal. Changing a value and then
   changing it back leaves nothing to lose, and reads as untouched. */
export const hasEnteredData = (plan) => !sameData(plan, firstRunPlan());
