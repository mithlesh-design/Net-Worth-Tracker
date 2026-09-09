/* ═══════════════════════════════════════════════════════════════════════════
   INCOME TAX
   Moved verbatim from app/page.jsx (lines 94-118).

   NOTE ON USAGE: this is slab-based and non-linear. It grants the standard
   deduction, the nil slab and the rebate ONCE per call, so it must be called
   once on the summed gross pool. Summing calcIncomeTax() over individual income
   sources grants all three allowances once per source and understates tax badly.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── New Tax Regime 2024-25 (India) ─── */
export function calcIncomeTax(annualIncome) {
  // Standard deduction of ₹75,000
  const taxable = Math.max(0, annualIncome - 75000);
  let tax = 0;
  const slabs = [
    { limit: 400000, rate: 0 },      // 0-4L: 0%
    { limit: 400000, rate: 0.05 },    // 4-8L: 5%
    { limit: 400000, rate: 0.10 },    // 8-12L: 10%
    { limit: 400000, rate: 0.15 },    // 12-16L: 15%
    { limit: 400000, rate: 0.20 },    // 16-20L: 20%
    { limit: Infinity, rate: 0.30 },  // 20L+: 30%
  ];
  let remaining = taxable;
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const taxableInSlab = Math.min(remaining, slab.limit);
    tax += taxableInSlab * slab.rate;
    remaining -= taxableInSlab;
  }
  // 4% cess
  tax *= 1.04;
  // Rebate: if taxable income <= 12L (after std deduction), tax = 0 under new regime
  if (taxable <= 1200000) tax = 0;
  return Math.round(tax);
}
