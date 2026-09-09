/* ═══════════════════════════════════════════════════════════════════════════
   INSTRUMENT ASSUMPTIONS

   ⚠ EVERY NUMBER HERE IS A DEFAULT, NOT A GUARANTEE.
   All of them are user-editable in the UI, and estimated future values built
   from them must always be labelled as estimates.

   Statutory rates and limits change. Re-verify against the sources below and
   bump ASSUMPTIONS_AS_OF before each release.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ASSUMPTIONS_AS_OF = "2026-09-09";

export const ASSUMPTION_SOURCES = {
  ppfRate:
    "7.1% p.a. — Ministry of Finance small-savings rate notification for the " +
    "July–September 2026 quarter (Q2 FY2026-27). Unchanged for nine consecutive " +
    "quarters. Rates are reset quarterly, so this is a current rate, not a fixed one.",
  ppfLimits:
    "₹1,50,000 maximum per financial year (deposits above this earn no interest " +
    "and get no tax benefit); ₹500 minimum per financial year to keep the account " +
    "active. Maturity is 15 years from the END of the financial year of opening, " +
    "so an account opened in FY2020-21 matures on 1 April 2036. Partial " +
    "withdrawals are allowed from the 7th financial year. Verified 2026-09-09.",
  epfRate:
    "8.25% for FY2025-26 — EPFO circular dated 1 July 2026, following Ministry of " +
    "Labour & Employment approval conveyed 17 June 2026. Third consecutive year at " +
    "this rate. Declared annually. Verified 2026-09-09.",
  epfExit:
    "Full withdrawal permitted at age 58, or on retirement. Verified 2026-09-09.",
  npsRate:
    "NPS is market-linked and has NO declared rate. The default below is a " +
    "long-run ESTIMATE chosen by this app, not a published figure, and must be " +
    "labelled 'estimate' wherever it appears in the UI.",
  npsExit:
    "Normal exit at age 60 (PFRDA). Non-government subscribers may now take up to " +
    "80% as lump sum with a minimum 20% annuity; government subscribers remain at " +
    "up to 60% lump sum with a minimum 40% annuity. A corpus of ₹5,00,000 or less " +
    "may be withdrawn in full. This app does NOT model the annuity split — it " +
    "treats the whole NPS balance as available from age 60, which overstates " +
    "spendable corpus. Flagged in the UI. Verified 2026-09-09.",
};

export const LIQUID = "liquid";
export const LOCKED = "locked";

/* defaultReturn === null means "inherit the user's expectedXIRR". That is what
   keeps a migrated v0 profile behaving exactly as it did before this change:
   in v0 a single XIRR applied to the entire portfolio. */
export const BUCKET_DEFS = {
  mf:          { tier: LIQUID, label: "Mutual Funds",      defaultReturn: null },
  stocks:      { tier: LIQUID, label: "Stocks",            defaultReturn: null },
  crypto:      { tier: LIQUID, label: "Crypto",            defaultReturn: null },
  fdrd:        { tier: LIQUID, label: "FD / RD",           defaultReturn: 7.0 },
  lic:         { tier: LIQUID, label: "LIC",               defaultReturn: 5.0 },
  unallocated: { tier: LIQUID, label: "Other assets",      defaultReturn: null },
  ppf:         { tier: LOCKED, label: "PPF", defaultReturn: 7.1,  lock: "ppfTenure" },
  epf:         { tier: LOCKED, label: "EPF", defaultReturn: 8.25, lock: "age58" },
  nps:         { tier: LOCKED, label: "NPS", defaultReturn: 9.0,  lock: "age60",
                 rateIsEstimate: true },
};

export const LIQUID_BUCKETS = Object.keys(BUCKET_DEFS).filter((b) => BUCKET_DEFS[b].tier === LIQUID);
export const LOCKED_BUCKETS = Object.keys(BUCKET_DEFS).filter((b) => BUCKET_DEFS[b].tier === LOCKED);

/* Statutory limits — see ASSUMPTION_SOURCES.ppfLimits */
export const PPF_ANNUAL_CAP = 150000;
export const PPF_ANNUAL_MIN = 500;

/* Maturity is measured from the END of the financial year of opening, which is
   why this is +16 and not +15: an account opened in 2020 matures in 2036. */
export const PPF_MATURITY_OFFSET_YEARS = 16;

export const EPF_WITHDRAWAL_AGE = 58;
export const NPS_EXIT_AGE = 60;

/* Exit tax. This app does NOT introduce instrument-specific tax logic: every
   liquid bucket inherits the user's single existing exit-tax slider. The locked
   buckets start at 0 because their maturity treatment differs from equity LTCG,
   and both are user-editable. The UI states this simplification explicitly
   rather than asserting a tax rule per instrument. */
export const DEFAULT_LOCKED_EXIT_TAX = 0;
