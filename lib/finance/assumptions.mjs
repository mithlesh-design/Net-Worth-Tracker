/* ═══════════════════════════════════════════════════════════════════════════
   INSTRUMENT ASSUMPTIONS

   ⚠ EVERY NUMBER HERE IS A DEFAULT, NOT A GUARANTEE.
   All of them are user-editable in the UI, and estimated future values built
   from them must always be labelled as estimates.

   Statutory rates and limits change. Re-verify against the sources below and
   bump ASSUMPTIONS_AS_OF before each release.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ASSUMPTIONS_AS_OF = "2026-09-14";

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
  volatility:
    "Annual standard deviation of nominal annual returns, used only by the " +
    "Success Score simulation. These are judgement calls on long-run realised " +
    "ranges, not published figures, and are deliberately not softened:\n" +
    "  mf 18   — a diversified Indian equity fund, below the Nifty 50's long-run " +
    "~20-22% because the fund is itself diversified.\n" +
    "  stocks 24 — a concentrated direct-equity book, above the index.\n" +
    "  crypto 70 — BTC's realised annual sigma has run 60-90%. A crypto-heavy " +
    "plan should score worse, so this is not toned down.\n" +
    "  fdrd 1.0  — principal-protected; the only live risk is reinvestment at " +
    "rollover.\n" +
    "  lic 1.5   — contractual/participating; the variation is the declared bonus.\n" +
    "  unallocated 12 — an unknown mix, kept mid so a migrated v0 profile (whose " +
    "whole net worth lands here) is neither flattered nor punished.\n" +
    "  ppf 0.75  — reset quarterly by the Ministry of Finance; realised 15-year " +
    "band roughly 7.1-8.8.\n" +
    "  epf 0.5   — declared annually; recent band 8.15-8.65.\n" +
    "  nps 10    — market-linked, roughly an Auto-LC50 blend of equity and debt.\n" +
    "  property 12 — residential real estate. Below equity because transactions " +
    "are infrequent and quoted prices are sticky, well above PPF because a " +
    "regional market can go sideways for a decade in real terms. Appraisal " +
    "smoothing makes reported series look calmer than the asset is; 12 is a " +
    "judgement call that deliberately does not treat a house as safe.\n" +
    "All are user-overridable via plan.bucketOverrides[bucket].volatility.",
};

export const LIQUID = "liquid";
export const LOCKED = "locked";
/* Owned outright but not sellable to fund a shortfall. drawFromBuckets builds
   its tier list from LIQUID and unlocked LOCKED only, so an illiquid bucket is
   structurally impossible to draw from rather than merely discouraged. */
export const ILLIQUID = "illiquid";

/* defaultReturn === null means "inherit the user's expectedXIRR". That is what
   keeps a migrated v0 profile behaving exactly as it did before this change:
   in v0 a single XIRR applied to the entire portfolio. */
/* `volatility` is the annual standard deviation of nominal annual returns, in
   percentage points. It is used ONLY by the Success Score simulation — the
   projection itself is deterministic and never reads it. See
   ASSUMPTION_SOURCES.volatility. Like every number in this file it is a
   default, not a guarantee, and anything derived from it must be labelled an
   estimate. */
export const BUCKET_DEFS = {
  mf:          { tier: LIQUID, label: "Mutual Funds",      defaultReturn: null, volatility: 18.0 },
  stocks:      { tier: LIQUID, label: "Stocks",            defaultReturn: null, volatility: 24.0 },
  crypto:      { tier: LIQUID, label: "Crypto",            defaultReturn: null, volatility: 70.0 },
  fdrd:        { tier: LIQUID, label: "FD / RD",           defaultReturn: 7.0,  volatility: 1.0 },
  lic:         { tier: LIQUID, label: "LIC",               defaultReturn: 5.0,  volatility: 1.5 },
  unallocated: { tier: LIQUID, label: "Other assets",      defaultReturn: null, volatility: 12.0 },
  ppf:         { tier: LOCKED, label: "PPF", defaultReturn: 7.1,  lock: "ppfTenure", volatility: 0.75 },
  epf:         { tier: LOCKED, label: "EPF", defaultReturn: 8.25, lock: "age58",     volatility: 0.5 },
  nps:         { tier: LOCKED, label: "NPS", defaultReturn: 9.0,  lock: "age60",     volatility: 10.0,
                 rateIsEstimate: true },
  property:    { tier: ILLIQUID, label: "Property", defaultReturn: 5.0, volatility: 12.0,
                 rateIsEstimate: true },
};

export const LIQUID_BUCKETS = Object.keys(BUCKET_DEFS).filter((b) => BUCKET_DEFS[b].tier === LIQUID);
export const LOCKED_BUCKETS = Object.keys(BUCKET_DEFS).filter((b) => BUCKET_DEFS[b].tier === LOCKED);
export const ILLIQUID_BUCKETS = Object.keys(BUCKET_DEFS).filter((b) => BUCKET_DEFS[b].tier === ILLIQUID);

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
