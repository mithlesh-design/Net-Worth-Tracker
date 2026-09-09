/* ═══════════════════════════════════════════════════════════════════════════
   AGE

   Date of birth is the client's field #2. It becomes the single source of truth
   for age once supplied; plan.currentAge remains the fallback so that older
   saved profiles — which have no date of birth — keep working unchanged.

   The two are never both authoritative: the UI hides the Current Age slider
   whenever a date of birth is set.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Calendar-aware, deliberately not (now - dob) / 31536000000, which drifts by a
   day across leap years and can report the wrong age on a birthday. */
export function ageFromDob(dob, today = new Date()) {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const monthDelta = today.getMonth() - d.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export const effectiveAge = (plan) =>
  ageFromDob(plan?.personal?.dob) ?? plan?.currentAge ?? null;

/* True when the date of birth is driving age, so the UI knows to render the
   derived read-out instead of the slider. */
export const isAgeDerived = (plan) => ageFromDob(plan?.personal?.dob) !== null;

export const todayISO = (today = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
};
