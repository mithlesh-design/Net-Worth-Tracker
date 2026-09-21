/* ═══════════════════════════════════════════════════════════════════════════
   HOUSEHOLD MEMBERS

   A plan describes one household: YOU, stored at the top level exactly as
   before, plus anyone else in plan.members[]. Each member carries the same
   field names the top level uses for a person's own money — incomes, holdings,
   contributions, return assumptions — so "one person's view" is always
   household fields + that person's fields, and every component written for
   the top-level plan works for a member unchanged.

   You stay at the top level rather than becoming members[0]. Moving you would
   rewrite every engine read, every golden fixture and the client-field check,
   for no difference a user could see. The asymmetry lives here and nowhere
   else: callers ask for a person by id and never branch on "is it you".

   Two views of the same data:
     personPlan  — one person's money against the household's FULL costs. The
                   engine builds one ledger per included person from these.
     memberPlan  — one person's money against THEIR SHARE of the costs, for
                   that person's own Strategy Hub tab.
   ═══════════════════════════════════════════════════════════════════════════ */

import { freshDefaults } from "../profile/schema.mjs";
import { ageFromDob, effectiveAge } from "../finance/age.mjs";

export const SELF = "self";

/* Eight keeps the Strategy Hub tab bar usable on a phone and bounds the
   Success Score, which runs the engine once per simulated path with one
   ledger per person. */
export const MAX_MEMBERS = 8;

export const RELATIONSHIPS = {
  spouse:  { label: "Spouse / Partner", short: "Spouse" },
  parent:  { label: "Parent",           short: "Parent" },
  child:   { label: "Child",            short: "Child" },
  sibling: { label: "Sibling",          short: "Sibling" },
  other:   { label: "Other family",     short: "Family member" },
};

export const RELATIONSHIP_ORDER = ["spouse", "parent", "child", "sibling", "other"];

/* A person's own fields. Everything else on the plan belongs to the household:
   lifeExpectancy, expenses, inflation, medical cover, goals — and your life
   insurance, which has no per-member equivalent yet. */
export const PERSON_KEYS = [
  "personal", "currentAge", "retirementAge",
  "incomes", "holdings", "contributions", "legacy", "properties",
  "expectedXIRR", "postRetireReturn", "investmentStepUp", "investSurplus",
  "surplusBucket", "exitTaxRate", "bucketOverrides",
  "ppfOpenedYear", "licInvestablePct",
];

/* What a new member inherits from you, so they start from the same return and
   tax assumptions rather than from app defaults the user never chose. */
const ASSUMPTION_KEYS = [
  "expectedXIRR", "postRetireReturn", "investmentStepUp", "investSurplus",
  "surplusBucket", "exitTaxRate", "bucketOverrides",
];

const NO_LIFE_INSURANCE = { value: 0, valueType: "sumAssured", surrenderValue: null };

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const members = (plan) => (Array.isArray(plan?.members) ? plan.members : []);

export const findMember = (plan, id) => members(plan).find((m) => m?.id === id) ?? null;

/* ── Who is in the household ── */

/* Everyone, you first. `data` is the object holding that person's fields: the
   plan itself for you, the member entry for anyone else. */
export function people(plan) {
  const hh = plan?.household ?? {};
  return [
    { id: SELF, relationship: "self", data: plan,
      included: hh.includeSelf !== false, costShare: num(hh.selfCostShare, 100) },
    ...members(plan).filter(Boolean).map((m) => ({
      id: m.id, relationship: m.relationship ?? "other", data: m,
      included: m.included !== false, costShare: num(m.costShare, 0),
    })),
  ];
}

export const includedPeople = (plan) => people(plan).filter((p) => p.included);

export const hasMembers = (plan) => members(plan).length > 0;

/* ── Names ── */

/* The label on a tab, a toggle row or a caption. An unnamed member falls back
   to their relationship, numbered only when two would otherwise read the same
   — "Parent 1", "Parent 2" — so the tab bar never shows two identical tabs. */
export function personLabel(plan, id) {
  if (id === SELF) return String(plan?.personal?.fullName ?? "").trim() || "You";
  const m = findMember(plan, id);
  if (!m) return "";
  const named = String(m.personal?.fullName ?? "").trim();
  if (named) return named;
  const short = (RELATIONSHIPS[m.relationship] ?? RELATIONSHIPS.other).short;
  const peers = members(plan).filter((o) =>
    o && !String(o.personal?.fullName ?? "").trim() && o.relationship === m.relationship);
  return peers.length > 1 ? `${short} ${peers.indexOf(m) + 1}` : short;
}

export const relationshipLabel = (relationship) =>
  (RELATIONSHIPS[relationship] ?? RELATIONSHIPS.other).label;

/* ── Paths ── */

/* The prefix that turns a person-relative path ("holdings.mf") into a plan
   path setField understands. null when the member no longer exists, so a
   stale write cannot land on somebody else's index. */
export function personPrefix(plan, id) {
  if (id === SELF) return "";
  const i = members(plan).findIndex((m) => m?.id === id);
  return i < 0 ? null : `members.${i}.`;
}

/* ── Age ── */

/* A member with no age of their own is taken to be your age. Only migrated
   spouses start that way, and validate() asks the user to confirm it. */
export function personAge(plan, id) {
  const selfAge = effectiveAge(plan);
  if (id === SELF) return selfAge;
  const m = findMember(plan, id);
  if (!m) return selfAge;
  return ageFromDob(m.personal?.dob) ?? (m.currentAge ?? selfAge);
}

/* ── Views ── */

/* One person's money against the household's full costs. For you this IS the
   plan — same object, nothing copied — which is what keeps every existing
   single-person projection byte-identical. */
export function personPlan(plan, id) {
  if (id === SELF) return plan;
  const m = findMember(plan, id);
  if (!m) return null;
  const own = Object.fromEntries(PERSON_KEYS.filter((k) => k in m).map((k) => [k, m[k]]));
  return {
    ...plan,
    ...own,
    currentAge: personAge(plan, id),
    /* A member's age is resolved into currentAge above; a DOB left in place
       would be read by effectiveAge and could disagree with it. */
    personal: { fullName: m.personal?.fullName ?? "", dob: null },
    lifeInsurance: NO_LIFE_INSURANCE,
    members: [],
    household: { includeSelf: true, selfCostShare: 100 },
  };
}

/* One person's money against THEIR SHARE of the household's costs — what their
   own Strategy Hub tab projects. Living costs, medical premiums and goals are
   scaled by the share; goal ages move onto the person's own age, because goals
   are entered against yours.

   With no members and your share at 100% this returns the plan untouched, so
   your tab starts exactly where the app always was. */
export function memberPlan(plan, id) {
  const base = personPlan(plan, id);
  if (!base) return null;
  const person = people(plan).find((p) => p.id === id);
  const share = Math.min(Math.max(num(person?.costShare), 0), 100) / 100;

  if (id === SELF && share === 1 && !hasMembers(plan)) return plan;

  const shift = num(personAge(plan, id)) - num(effectiveAge(plan));
  const out = {
    ...base,
    members: [],
    household: { includeSelf: true, selfCostShare: 100 },
  };
  if (share !== 1) {
    const e = plan.expenses ?? {};
    out.expenses = { ...e, household: num(e.household) * share, rent: num(e.rent) * share };
    const med = plan.medical ?? {};
    out.medical = {
      ...med,
      self: med.self && { ...med.self, premium: num(med.self.premium) * share },
      parents: med.parents && { ...med.parents, premium: num(med.parents.premium) * share },
    };
  }
  if (share !== 1 || shift !== 0) {
    out.goals = (plan.goals ?? []).map((g) => ({
      ...g,
      amount: num(g.amount) * share,
      age: num(g.age) + shift,
    }));
  }
  return out;
}

/* ── Creating members ── */

/* A starting age that is usually close, so the slider opens somewhere
   sensible. It is a default the user sees and edits, never a silent guess. */
function defaultAge(relationship, selfAge) {
  const you = num(selfAge, 30);
  if (relationship === "parent") return Math.min(you + 28, 90);
  if (relationship === "child") return Math.max(0, Math.min(you - 28, 10));
  return you;
}

export function newMember(plan, relationship = "other", id) {
  const d = freshDefaults();
  const rel = RELATIONSHIPS[relationship] ? relationship : "other";
  const inherited = Object.fromEntries(
    ASSUMPTION_KEYS.map((k) => [k, structuredClone(plan?.[k] ?? d[k])]));
  return {
    id,
    relationship: rel,
    /* Adding someone and seeing the household total move is what people
       expect. Saved spouses keep whatever they were set to — see migrate. */
    included: true,
    /* Nobody's own tab changes until the user splits the costs. */
    costShare: 0,
    personal: { fullName: "", dob: null },
    currentAge: defaultAge(rel, effectiveAge(plan)),
    retirementAge: rel === "spouse" || rel === "sibling"
      ? num(plan?.retirementAge, d.retirementAge)
      : 60,
    incomes: [],
    holdings: d.holdings,
    contributions: d.contributions,
    legacy: { monthlyInvestment: 0 },
    properties: [],
    ppfOpenedYear: null,
    licInvestablePct: 0,
    ...inherited,
  };
}
