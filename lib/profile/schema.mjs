/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE SCHEMA — v1

   The single definition of what a saved profile contains. `serialize` is a deep
   clone of the whole plan, so there is no hand-maintained list of keys to keep
   in sync between save and load. That removes the class of bug where a new
   field is added to gatherSettings but forgotten in applySettings.

   Derived values (totals, monthly equivalents, projections) are NEVER stored.
   They are always recomputed from the underlying entries, so a saved total
   cannot drift out of sync with its parts.

   Conventions:
     - money is a Number in rupees
     - dates are ISO "YYYY-MM-DD" strings
     - insurance answers are explicit booleans, never "undefined means no"
     - null means "not known"; 0 means "confirmed zero". They are different.
   ═══════════════════════════════════════════════════════════════════════════ */

import { BUCKET_DEFS } from "../finance/assumptions.mjs";

export const SCHEMA_VERSION = 2;

/* One contribution stream. `annualReturn: null` inherits the bucket default,
   which in turn may inherit the user's expectedXIRR. `fundedFromPayroll` marks
   money that never reaches the bank account — an EPF deduction, say — so it is
   credited to the bucket without being subtracted from available cash a second
   time. */
export const contribution = (over = {}) => ({
  amount: 0,
  frequency: "monthly",
  annualReturn: null,
  stepUp: 10,
  fundedFromPayroll: false,
  ...over,
});

export const DEFAULTS = {
  schemaVersion: SCHEMA_VERSION,

  /* ── Client fields 1-2 ── */
  personal: { fullName: "", dob: null },

  /* Timeline. currentAge is the fallback used only when personal.dob is null. */
  currentAge: 28,
  lifeExpectancy: 85,
  /* Explicit, rather than derived from min(incomes[].retireAge). It drives the
     return switch, the contribution stop and the locked-bucket unlock check, all
     of which previously disagreed with each other for multi-income profiles. */
  retirementAge: 55,

  /* ── Client fields 3-5 ── */
  incomes: [
    { id: 1, name: "Salary", role: "salary", amount: 150000, frequency: "monthly",
      basis: "gross", growthRate: 10, retireAge: 55 },
    { id: 2, name: "Other Income", role: "other", amount: 0, frequency: "monthly",
      basis: "gross", growthRate: 0, retireAge: 55 },
  ],

  /* ── Client fields 6-7 ── */
  expenses: { household: 50000, rent: 0 },
  inflationRate: 6,
  lifestyleCreep: 2,
  medicalInflation: 6,
  /* Whether rent stops once a home goal completes. False on migrated profiles so
     their projection is unchanged; true on new ones because paying rent and an
     EMI on the same home for life is not what anyone means. */
  stopRentOnHomePurchase: true,

  /* ── Client fields 8-9 ── */
  medical: {
    self: { enabled: false, coverage: 0, premium: 0, premiumFrequency: "yearly" },
    parents: {
      enabled: false, coverage: 0, premium: 0, premiumFrequency: "yearly",
      /* "separate" | "includedInSelfPolicy". On the latter the parents' premium
         input is disabled in the UI and ignored in the arithmetic, so one family
         floater premium is never counted twice. The typed value is preserved. */
      premiumMode: "separate",
    },
  },

  /* ── Client fields 10-16 ── */
  contributions: {
    mfSip: contribution(),
    nps: contribution(),
    ppf: contribution(),
    epf: contribution({ fundedFromPayroll: true }),
    /* The employer share is in neither gross nor take-home pay. Omitting it
       understates the EPF corpus by roughly half. */
    epfEmployer: contribution({ fundedFromPayroll: true }),
    rd: contribution(),
    lic: contribution(),
    /* Client field 16. Each entry: { id, name, amount, frequency, annualReturn,
       stepUp, fundedFromPayroll }. A name is required once amount > 0. */
    other: [],
  },
  /* Calendar year the PPF account was opened. null means "assume this year".
     PPF's lock is tenure-based, not age-based. */
  ppfOpenedYear: null,
  /* What fraction of a LIC premium builds cash value. Defaults to 0: a premium
     is an outflow, and for term cover none of it is ever an asset. A default of
     zero can never overstate net worth. */
  licInvestablePct: 0,

  /* ── Client fields 17-23 ──
     fd and rd are captured separately but presented as the single FD/RD total
     the intake sheet asks for. `unallocated` holds a legacy aggregate net worth
     until the user supplies a breakdown. */
  holdings: { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0,
              unallocated: 0 },

  /* ── Client field 24 ──
     valueType disambiguates the client's single "Life Insurance value" field.
     A sum assured is a death benefit and is never added to net worth; only a
     surrender/cash value is an asset. surrenderValue stays null when unknown —
     nothing is inferred from the sum assured. */
  lifeInsurance: { value: 0, valueType: "sumAssured", surrenderValue: null },

  /* The v0 aggregate SIP target. Used ONLY when no detailed contribution is
     non-zero. The two are never summed. */
  legacy: { monthlyInvestment: 0 },

  investmentStepUp: 10,
  expectedXIRR: 12,
  postRetireReturn: 7,
  exitTaxRate: 12.5,
  /* { [bucket]: { annualReturn, exitTax, unlockAge } } — user overrides of the
     per-instrument defaults. Empty means "use the defaults". */
  bucketOverrides: {},
  investSurplus: true,
  surplusBucket: "mf",

  /* Goal amounts are entered in today's rupees. Off, the engine charges that
     amount at the target age — a 30 L education at 45 costs 30 L. On, it
     charges what the goal will actually cost by then (80.78 L at 6%).

     Default false because that is what every saved profile was projected with;
     turning it on is a decision the user makes, not one a migration makes for
     them. Both this and the Goal Gap chart read goalCostAt(), so whichever way
     it is set the two screens agree. */
  inflateGoals: false,

  goals: [
    { id: 1, name: "Buy Home", emoji: "home", age: 32, amount: 8000000,
      hasLoan: true, downPaymentPct: 20, loanRate: 8.5, loanTenure: 20,
      appreciationRate: 5, maintenancePct: 1 },
    { id: 2, name: "Kid's Education", emoji: "education", age: 45, amount: 3000000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0 },
  ],
};

/* The names of the six client-specified contribution streams, in intake order.
   epfEmployer is a supporting input, not one of the client's 24 fields. */
export const NAMED_CONTRIBUTIONS = ["mfSip", "nps", "ppf", "epf", "rd", "lic"];

/* Which bucket each contribution stream feeds. */
export const CONTRIBUTION_BUCKET = {
  mfSip: "mf", nps: "nps", ppf: "ppf", epf: "epf", epfEmployer: "epf",
  rd: "fdrd", lic: "lic",
};

export const HOLDING_BUCKET = {
  mf: "mf", fd: "fdrd", rd: "fdrd", ppf: "ppf", nps: "nps", epf: "epf",
  stocks: "stocks", crypto: "crypto", unallocated: "unallocated",
};

export const BUCKET_NAMES = Object.keys(BUCKET_DEFS);

export const serialize = (plan) => JSON.parse(JSON.stringify(plan));

export const freshDefaults = () => structuredClone(DEFAULTS);

/* The state the app opened on before this work, in v0 shape. Passing it through
   migrate() on first run gives a new user exactly the starting profile they saw
   previously, and exercises the migration path on every fresh load rather than
   only when someone happens to open an old saved profile. */
export const FIRST_RUN_V0 = {
  currentAge: 28,
  lifeExpectancy: 85,
  incomes: [
    { id: 1, name: "Salary", amount: 150000, frequency: "monthly", growthRate: 10, retireAge: 55 },
    /* Client field 4, "Other Income (If any)". Seeded at zero so the field is
       visible out of the box; migrate() gives index 0 role "salary" and the
       rest role "other". */
    { id: 2, name: "Other Income", amount: 0, frequency: "monthly", growthRate: 0, retireAge: 55 },
  ],
  monthlyExpense: 50000,
  inflationRate: 6,
  lifestyleCreep: 2,
  currentNW: 500000,
  monthlyInvestment: 50000,
  investmentStepUp: 10,
  expectedXIRR: 12,
  investSurplus: true,
  postRetireReturn: 7,
  exitTaxRate: 12.5,
  goals: [
    { id: 1, name: "Buy Home", emoji: "home", age: 32, amount: 8000000,
      hasLoan: true, downPaymentPct: 20, loanRate: 8.5, loanTenure: 20,
      appreciationRate: 5, maintenancePct: 1 },
    { id: 2, name: "Kid's Education", emoji: "education", age: 45, amount: 3000000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0 },
  ],
};
