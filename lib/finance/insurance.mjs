/* ═══════════════════════════════════════════════════════════════════════════
   MEDICAL INSURANCE

   Coverage (sum insured) is a PROTECTION amount. It is not a monthly expense
   and it is not an asset, so it is deliberately absent from every return value
   in this module. Only the premium touches cash flow.
   ═══════════════════════════════════════════════════════════════════════════ */

import { toAnnual } from "./format.mjs";

/* Premiums normalised to an annual figure for the cash-flow waterfall. The
   stored frequency is never rewritten: the UI keeps showing the payment
   frequency the user actually pays at, alongside a monthly equivalent.

   The parents' premium is charged only when it is a separate policy. On a
   family floater the parents are covered by the self policy, whose premium is
   already counted, so charging both would bill the same rupee twice. The UI
   disables the parents' premium input in that mode rather than quietly
   subtracting a number the user can still see and edit. */
export function annualPremium(medical) {
  const self = medical?.self;
  const parents = medical?.parents;

  const selfAnnual = self?.enabled
    ? toAnnual(Number(self.premium) || 0, self.premiumFrequency || "yearly")
    : 0;

  const parentsAnnual =
    parents?.enabled && parents.premiumMode !== "includedInSelfPolicy"
      ? toAnnual(Number(parents.premium) || 0, parents.premiumFrequency || "yearly")
      : 0;

  return { self: selfAnnual, parents: parentsAnnual, total: selfAnnual + parentsAnnual };
}

/* Total protection in force. Reported to the user as cover, never added to
   net worth. Kept separate from annualPremium so the two can never be confused
   at a call site. */
export function totalCoverage(medical) {
  const self = medical?.self?.enabled ? Number(medical.self.coverage) || 0 : 0;
  const parents = medical?.parents?.enabled ? Number(medical.parents.coverage) || 0 : 0;
  return { self, parents, total: self + parents };
}

/* True when the parents' premium input should be disabled in the UI. */
export const parentsPremiumIsShared = (medical) =>
  !!medical?.parents?.enabled && medical.parents.premiumMode === "includedInSelfPolicy";
