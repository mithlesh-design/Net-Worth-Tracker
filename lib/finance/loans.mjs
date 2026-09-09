/* ═══════════════════════════════════════════════════════════════════════════
   LOANS
   Moved verbatim from app/page.jsx (lines 121-142).
   ═══════════════════════════════════════════════════════════════════════════ */

/* EMI Calculator */
export function calcEMI(principal, annualRate, tenureYears) {
  if (principal <= 0 || tenureYears <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/* Loan yearly balance */
export function loanScheduleYearly(principal, annualRate, tenureYears) {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  const emi = calcEMI(principal, annualRate, tenureYears);
  let balance = principal;
  const yearly = [];
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    balance = Math.max(0, balance - (emi - interest));
    if (m % 12 === 0 || m === n) yearly.push(Math.round(balance));
  }
  return yearly;
}
