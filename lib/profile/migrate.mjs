/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE MIGRATION — a chain, v0 → v1 → v2

   Pure and idempotent. Applied on every load rather than as a one-time backfill,
   because saved rows are never rewritten: the client always POSTs a new row, so
   v0 JSON survives in profiles.settings indefinitely.

   Two rules govern everything here:
     1. Nothing is invented. A v0 profile records an aggregate net worth but not
        its breakdown, so the aggregate is preserved as an explicit "unallocated"
        holding and every named holding stays 0. We do not guess an allocation.
     2. Nothing is lost. Missing sub-fields are filled with defaults rather than
        dropped, and a confirmed 0 is never converted into a default.

   Each step upgrades by exactly one version and stamps its own schemaVersion.
   A step may therefore read a field a later step deletes — that hand-off is the
   point of the chain, and is why migrateV0toV1 still writes incomes[].basis
   even though v2 removes it.
   ═══════════════════════════════════════════════════════════════════════════ */

import { DEFAULTS, SCHEMA_VERSION, freshDefaults } from "./schema.mjs";

/* Stored JSON can carry strings where numbers are expected ("50000" + 12
   concatenates instead of adding). Coerce at this boundary, once. */
const num = (v, fallback = 0) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (v, fallback = false) => (typeof v === "boolean" ? v : fallback);

/* Keyed by the version being upgraded FROM. */
const MIGRATIONS = { 0: migrateV0toV1, 1: migrateV1toV2 };

export function migrate(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return freshDefaults();

  let p = raw;
  let v = num(p.schemaVersion, 0);

  /* A version AHEAD of this build (someone rolled the deployment back) skips the
     loop entirely and is passed through as-is. That risks reading a field whose
     meaning has since changed — but the alternative, returning freshDefaults(),
     is worse: page.jsx writes the local draft 600ms after mount unconditionally,
     so discarding the profile here would silently and permanently overwrite the
     user's own draft with defaults. A misread is visible and recoverable; that
     is not. Preserve the data. */
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    /* A gap in the chain means this build bumped SCHEMA_VERSION without adding
       the step — a developer error, not user data. Nothing sound can be done
       with the profile, so start clean rather than guess at its shape. */
    if (!step) return freshDefaults();
    p = step(p);
    const next = num(p.schemaVersion, 0);
    /* A step that fails to advance the version would spin here forever. */
    if (!(next > v)) return freshDefaults();
    v = next;
  }

  return fillDefaults(p);
}

/* Builds on freshDefaults(), which is the CURRENT (v2) default object, so the
   result is "v2 base carrying v1 income semantics" rather than a byte-exact v1
   document. That is all the chain needs: migrateV1toV2 only reads incomes[] and
   medicalInflation, both of which this writes. Freezing a literal V1_DEFAULTS
   copy would be more precise and would double the maintenance of a 110-line
   object every time DEFAULTS changes; it is not worth it. */
function migrateV0toV1(raw) {
  const p = freshDefaults();

  /* ── Scalars that carry over unchanged ── */
  p.currentAge = num(raw.currentAge, p.currentAge);
  p.lifeExpectancy = num(raw.lifeExpectancy, p.lifeExpectancy);
  p.inflationRate = num(raw.inflationRate, p.inflationRate);
  p.lifestyleCreep = num(raw.lifestyleCreep, p.lifestyleCreep);
  p.investmentStepUp = num(raw.investmentStepUp, p.investmentStepUp);
  p.expectedXIRR = num(raw.expectedXIRR, p.expectedXIRR);
  p.postRetireReturn = num(raw.postRetireReturn, p.postRetireReturn);
  p.exitTaxRate = num(raw.exitTaxRate, p.exitTaxRate);
  p.investSurplus = bool(raw.investSurplus, p.investSurplus);

  /* ── Incomes ──
     v0 ran calcIncomeTax over every source, so "gross" is the basis that
     preserves behaviour exactly.

     A v0 income may predate the `frequency` field. toAnnual's fallback treats a
     missing frequency as yearly, which turns a ₹1,50,000 monthly salary into
     ₹1,50,000 a year — a 12x understatement that would silently wreck the
     projection. Default it to monthly and flag it so the UI can ask. */
  if (Array.isArray(raw.incomes) && raw.incomes.length) {
    p.incomes = raw.incomes.map((i, idx) => {
      const src = i && typeof i === "object" ? i : {};
      const assumed = src.frequency === undefined || src.frequency === null;
      return {
        id: src.id ?? idx + 1,
        name: src.name ?? `Income ${idx + 1}`,
        role: idx === 0 ? "salary" : "other",
        amount: num(src.amount),
        frequency: assumed ? "monthly" : src.frequency,
        ...(assumed ? { frequencyAssumed: true } : {}),
        basis: "gross",
        growthRate: num(src.growthRate),
        retireAge: num(src.retireAge, 55),
      };
    });
  }
  /* Materialise the retirement age rather than leaving it derived, so later
     edits to an individual source's retireAge do not silently shift it. */
  p.retirementAge = p.incomes.length
    ? Math.min(...p.incomes.map((i) => i.retireAge))
    : 60;

  /* ── Expenses ──
     The whole v0 lump goes to household. Splitting rent out heuristically would
     be inventing data. stopRentOnHomePurchase stays false so a migrated
     projection is unchanged. */
  p.expenses.household = num(raw.monthlyExpense, p.expenses.household);
  p.expenses.rent = 0;
  p.stopRentOnHomePurchase = false;

  /* ── Holdings ──
     The v0 aggregate becomes an explicit unallocated holding. Every named
     holding stays 0: we do not know the breakdown. The UI offers a one-click
     reconciliation once the user starts entering real holdings, and never
     auto-decrements this figure. */
  p.holdings.unallocated = num(raw.currentNW);

  /* ── Contributions ──
     The v0 aggregate SIP target is parked in `legacy`, used only while no
     detailed contribution is non-zero. The two are never summed. */
  p.legacy.monthlyInvestment = num(raw.monthlyInvestment);

  /* ── Goals ──
     v0 goals may be missing fields the engine divides by. `g.amount *
     (g.downPaymentPct / 100)` on an undefined downPaymentPct yields NaN, which
     then propagates through net worth and blanks the entire chart from that
     year on. Fill every field; drop none. */
  if (Array.isArray(raw.goals)) {
    p.goals = raw.goals.map((g, idx) => {
      const src = g && typeof g === "object" ? g : {};
      return {
        id: src.id ?? idx + 1,
        name: src.name ?? "Goal",
        emoji: src.emoji ?? "other",
        age: num(src.age, p.currentAge + 5),
        amount: num(src.amount),
        hasLoan: bool(src.hasLoan, false),
        downPaymentPct: num(src.downPaymentPct, 100),
        loanRate: num(src.loanRate, 9),
        loanTenure: num(src.loanTenure, 5),
        appreciationRate: num(src.appreciationRate),
        maintenancePct: num(src.maintenancePct),
      };
    });
  }

  /* Stamp the literal target, not SCHEMA_VERSION: this step produces a v1
     document and the dispatcher must still route it through migrateV1toV2.
     Inheriting the current version from freshDefaults() would skip that step. */
  p.schemaVersion = 1;
  return p;
}

/* ── v1 → v2 ──
   Placeholder. Fills in with the take-home income conversion. */
function migrateV1toV2(raw) {
  const p = structuredClone(raw);
  p.schemaVersion = 2;
  return p;
}

/* Fills in keys a newer DEFAULTS has gained since this profile was saved,
   without touching anything the profile already carries.

   Arrays are taken wholesale from the profile: a user's empty income list is a
   real answer, not a missing one, and merging defaults into it would resurrect
   deleted entries. */
function fillDefaults(raw) {
  const merge = (base, over) => {
    if (over === undefined) return base;
    if (Array.isArray(base) || Array.isArray(over)) return over;
    if (base && typeof base === "object" && over && typeof over === "object") {
      const out = { ...base };
      for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
      return out;
    }
    return over;
  };
  return merge(freshDefaults(), raw);
}

export { migrateV0toV1, migrateV1toV2, fillDefaults };
