/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE SCHEMA — v4

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

export const SCHEMA_VERSION = 4;

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
  /* Amounts are take-home: what actually reaches the bank. There is no tax
     model, so a figure entered here is never reduced again. */
  incomes: [
    { id: 1, name: "Salary", role: "salary", amount: 137433, frequency: "monthly",
      growthRate: 10, retireAge: 55 },
    { id: 2, name: "Other Income", role: "other", amount: 0, frequency: "monthly",
      growthRate: 0, retireAge: 55 },
  ],

  /* Everyone else whose money is part of the plan. Each entry uses the same
     field names the top level uses for YOUR money (incomes, holdings,
     contributions, return assumptions, ...), plus:
       { id, relationship, included, costShare, ageAssumed? }
     lib/household/members.mjs owns the shape — PERSON_KEYS lists the person
     fields and newMember() builds an entry — so nothing else hand-assembles
     one. You stay at the top level; see that file for why.

     Arrays are taken wholesale by fillDefaults, so a field added to members
     later will NOT backfill into saved entries. Read member fields through
     num(x, default) or the helpers in members.mjs. */
  members: [],

  /* Your own place in the household, mirroring the two fields each member
     carries. includeSelf: whether your money counts in the household
     projection. selfCostShare: the % of household costs YOUR tab carries. The
     household projection always charges costs in full, whoever is included. */
  household: { includeSelf: true, selfCostShare: 100 },

  /* ── Client fields 6-7 ── */
  expenses: { household: 50000, rent: 0 },
  inflationRate: 6,
  lifestyleCreep: 2,
  /* Off: living costs grow at inflationRate + lifestyleCreep for life. On: every
     year after your retirement age grows at postRetireInflation instead. Off by
     default, so a saved profile (which has neither field) projects exactly as
     before. The rate is kept while switched off, so switching back on restores
     what was typed. */
  usePostRetireInflation: false,
  postRetireInflation: 6,
  /* Whether rent stops once a home goal completes. False on migrated profiles so
     their projection is unchanged; true on new ones because paying rent and an
     EMI on the same home for life is not what anyone means. */
  stopRentOnHomePurchase: true,

  /* ── Client fields 8-9 ── */
  medical: {
    /* unlimitedCoverage: the policy has no sum-insured ceiling. The coverage
       figure is then not asked for, but it is kept, so switching back to a
       fixed amount restores what was typed. */
    self: { enabled: false, coverage: 0, unlimitedCoverage: false, premium: 0, premiumFrequency: "yearly" },
    parents: {
      enabled: false, coverage: 0, unlimitedCoverage: false, premium: 0, premiumFrequency: "yearly",
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
    /* No life insurance premium here: since v4 it belongs to its policy, in
       lifePolicies, where it is charged as an outflow and never banked. */
    /* Client field 16. Each entry: { id, name, amount, frequency, annualReturn,
       stepUp, fundedFromPayroll }. A name is required once amount > 0. */
    other: [],
  },
  /* Calendar year the PPF account was opened. null means "assume this year".
     PPF's lock is tenure-based, not age-based. */
  ppfOpenedYear: null,

  /* ── Client fields 17-23 ──
     fd and rd are captured separately but presented as the single FD/RD total
     the intake sheet asks for. `unallocated` holds a legacy aggregate net worth
     until the user supplies a breakdown. */
  holdings: { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0,
              unallocated: 0 },

  /* ── Client field 24, expanded (client items 6–11) ──
     Your life insurance policies. lib/finance/lifePolicies.mjs owns the shape
     (newPolicy builds one) and the cash flows: premium out until an age,
     optional annual income, optional lump sum at maturity. A sum assured is a
     death benefit, recorded but never counted as money. A person field: a
     member carries their own list.

     Arrays are taken wholesale by fillDefaults, so read policy fields through
     num(x, default). */
  lifePolicies: [],

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

  /* Goal amounts are entered in today's rupees. On, the engine charges what the
     goal will actually cost by its target age (80.78 L at 6% for a 30 L goal 17
     years out). Off, it charges the amount as entered.

     On for new profiles: the goal form shows each goal's future cost, and the
     plan should pay the figure it shows. A saved profile keeps whatever it was
     saved with — the value is stored, so fillDefaults never overrides it — and
     migrateV0toV1 pins false for v0 profiles, which were projected without it.
     Both this and the Goal Gap chart read goalCostAt(), so whichever way it is
     set the two screens agree. */
  inflateGoals: true,

  /* Property you own TODAY. A home you plan to BUY is a goal, not an entry
     here — the goal machinery already charges its down payment, EMI and
     maintenance. The two describe disjoint periods (owned from today vs bought
     at a future age), which is what makes double-counting structurally
     impossible rather than merely discouraged. See BEHAVIOUR-NOTES.

     Each item:
       { id, name, value, rentalIncome, maintenancePct,
         loanOutstanding, loanRate, loanRemainingYears }

     There is no per-property appreciation rate. Property appreciates at the
     `property` bucket rate like every other asset class, so it also takes a
     volatility draw in the Success Score; a per-item rate applied directly
     would bypass that and model a house as risk-free.

     loanOutstanding is the balance left TODAY, not the original principal, and
     loanRemainingYears the years left to run — for a property already owned,
     those are the numbers the user actually has to hand.

     Every field is read through num(x, default) at use time: fillDefaults takes
     arrays wholesale, so sub-fields added later would never backfill into a
     saved item. */
  properties: [],

  /* Each goal: { id, name, emoji (its type key), age, amount (TODAY's cost),
     inflationRate, hasLoan, downPaymentPct, loanRate, loanTenure,
     appreciationRate, maintenancePct }.

     inflationRate is the goal's own expected price growth. null means it has
     never been set, and goalInflationRate() falls back to the rule every goal
     used before the field existed — see there. */
  goals: [
    { id: 1, name: "Buy Home", emoji: "home", age: 32, amount: 8000000, inflationRate: null,
      hasLoan: true, downPaymentPct: 20, loanRate: 8.5, loanTenure: 20,
      appreciationRate: 5, maintenancePct: 1 },
    { id: 2, name: "Kid's Education", emoji: "education", age: 45, amount: 3000000, inflationRate: null,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0 },
  ],
};

/* The names of the client-specified contribution streams, in intake order.
   epfEmployer is a supporting input, not one of the client's 24 fields. The
   sixth, "lic", moved onto life insurance policies in v4. */
export const NAMED_CONTRIBUTIONS = ["mfSip", "nps", "ppf", "epf", "rd"];

/* Which bucket each contribution stream feeds. */
export const CONTRIBUTION_BUCKET = {
  mfSip: "mf", nps: "nps", ppf: "ppf", epf: "epf", epfEmployer: "epf",
  rd: "fdrd",
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
