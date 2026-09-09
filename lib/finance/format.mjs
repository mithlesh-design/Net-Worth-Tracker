/* ═══════════════════════════════════════════════════════════════════════════
   FORMATTING & FREQUENCY HELPERS
   Moved verbatim from app/page.jsx (lines 42-91).
   ═══════════════════════════════════════════════════════════════════════════ */

export const CURRENT_YEAR = new Date().getFullYear();

export const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return sign + "₹" + (abs / 1e7).toFixed(2) + " Cr";
  if (abs >= 1e5) return sign + "₹" + (abs / 1e5).toFixed(2) + " L";
  return sign + "₹" + abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export const fmtAxis = (v) => {
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(0)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`;
  return `₹${v}`;
};

/* Indian Number-to-Words */
const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function convertChunk(n) {
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convertChunk(n % 100) : "");
  const th = Math.floor(n / 1000);
  const rem = n % 1000;
  return convertChunk(th) + " Thousand" + (rem > 0 ? " " + convertChunk(rem) : "");
}
export function numToWordsIndian(n) {
  if (n === 0) return "Zero Rupees";
  if (isNaN(n) || !isFinite(n)) return "";
  const abs = Math.abs(Math.round(n));
  const parts = [];
  const cr = Math.floor(abs / 1e7);
  const lk = Math.floor((abs % 1e7) / 1e5);
  const rest = abs % 1e5;
  if (cr) parts.push(convertChunk(cr) + " Crore");
  if (lk) parts.push(convertChunk(lk) + " Lakh");
  if (rest) parts.push(convertChunk(rest));
  return (n < 0 ? "Minus " : "") + parts.join(", ") + " Rupees";
}
export const toWords = (v) => (!v || isNaN(v) || v === 0) ? "" : "₹ " + numToWordsIndian(v);

/* Frequency helper */
export const toAnnual = (amount, frequency) => {
  if (frequency === "monthly") return amount * 12;
  if (frequency === "quarterly") return amount * 4;
  return amount; // yearly
};

/* Monthly equivalent of an amount stated at any frequency. The stored frequency is
   never rewritten — this is for display and for cash-flow normalisation only. */
export const monthlyEquivalent = (amount, frequency) => toAnnual(amount, frequency) / 12;
