"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import AuthButton from "@/components/AuthButton";
import { useAppSession } from "@/components/DemoAuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import logoDark from "@/components/Img/DARK.svg";
import logoLight from "@/components/Img/LIGHT.svg";

import { fmt, toAnnual } from "@/lib/finance/format.mjs";
import { runProjectionV1 } from "@/lib/finance/projection.mjs";
import { computeGoalGap } from "@/lib/finance/goalgap.mjs";
import { effectiveAge, isAgeDerived } from "@/lib/finance/age.mjs";
import { annualPremium } from "@/lib/finance/insurance.mjs";
import { buildContributionPlan } from "@/lib/finance/contributions.mjs";
import { newMember, personPrefix, MAX_MEMBERS } from "@/lib/household/members.mjs";
import { migrate } from "@/lib/profile/migrate.mjs";
import { serialize, FIRST_RUN_V0 } from "@/lib/profile/schema.mjs";
import { validate, clampPlan, hasErrors } from "@/lib/profile/validate.mjs";
import { readDraft, writeDraft, clearDraft } from "@/lib/profile/draft.mjs";
import { getProfileStore } from "@/lib/profile/store.mjs";

import WizardShell from "@/components/wizard/WizardShell";
import { Button } from "@/components/ui/button";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* Pure state writers. Array indices in a path ("members.2.holdings.mf") walk
   like object keys. */
function writePath(prev, path, value) {
  const next = structuredClone(prev);
  const keys = path.split(".");
  let node = next;
  for (const k of keys.slice(0, -1)) node = node[k];
  node[keys[keys.length - 1]] = value;
  return next;
}

function updateInList(prev, listPath, id, key, val) {
  const next = structuredClone(prev);
  const keys = listPath.split(".");
  let node = next;
  for (const k of keys.slice(0, -1)) node = node[k];
  const last = keys[keys.length - 1];
  node[last] = node[last].map((it) => (it.id === id ? { ...it, [key]: val } : it));
  return next;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function FinancialPlanner() {

  /* ── Theme ── */
  const { theme, toggleTheme } = useTheme();

  const [plan, setPlan] = useState(() => migrate(FIRST_RUN_V0));

  /* Writes one field by dotted path, e.g. setField("expenses.rent", 12000). */
  const setField = useCallback((path, value) => {
    setPlan((prev) => writePath(prev, path, value));
  }, []);

  const updateListItem = useCallback((listPath, id, key, val) => {
    setPlan((prev) => updateInList(prev, listPath, id, key, val));
  }, []);

  /* The same two writers, addressed to one person. The member's index is
     resolved INSIDE the update, against the state being updated, so a write
     from a card whose member was just removed is dropped rather than landing
     on whoever moved into that index. */
  const setPersonField = useCallback((personId, path, value) => {
    setPlan((prev) => {
      const prefix = personPrefix(prev, personId);
      return prefix === null ? prev : writePath(prev, prefix + path, value);
    });
  }, []);

  const updatePersonListItem = useCallback((personId, listPath, id, key, val) => {
    setPlan((prev) => {
      const prefix = personPrefix(prev, personId);
      return prefix === null ? prev : updateInList(prev, prefix + listPath, id, key, val);
    });
  }, []);

  /* Read-only aliases so the existing JSX keeps working unchanged. */
  const {
    currentAge, lifeExpectancy, incomes, inflationRate, lifestyleCreep,
    investmentStepUp, expectedXIRR, investSurplus, postRetireReturn,
    exitTaxRate, goals,
  } = plan;
  const monthlyInvestment = plan.legacy.monthlyInvestment;

  const setCurrentAge = (v) => setField("currentAge", v);
  const setLifeExpectancy = (v) => setField("lifeExpectancy", v);
  const setInvestmentStepUp = (v) => setField("investmentStepUp", v);
  const setExpectedXIRR = (v) => setField("expectedXIRR", v);
  const setInvestSurplus = (v) => setField("investSurplus", v);
  const setPostRetireReturn = (v) => setField("postRetireReturn", v);
  const setMonthlyInvestment = (v) => setField("legacy.monthlyInvestment", v);

  /* Monotonic ids. Date.now() collides on a fast double-click. */
  const nextId = useRef(Date.now());
  const makeId = () => ++nextId.current;

  /* ── Income CRUD ── */
  const addIncome = (newInc) => {
    setField("incomes", [...incomes, { ...newInc, id: makeId() }]);
  };
  const removeIncome = (id) => setField("incomes", incomes.filter((i) => i.id !== id));
  const updateIncome = (id, key, val) => updateListItem("incomes", id, key, val);

  /* ── Household members ──
     Added and removed here only; every other step reads plan.members. */
  const addMember = (relationship) => {
    const id = makeId();
    setPlan((prev) => {
      const current = prev.members ?? [];
      if (current.length >= MAX_MEMBERS) return prev;
      return { ...prev, members: [...current, newMember(prev, relationship, id)] };
    });
    return id;
  };
  const removeMember = (id) => setPlan((prev) => ({
    ...prev, members: (prev.members ?? []).filter((m) => m.id !== id),
  }));

  /* ── Goal CRUD ── */
  const addGoal = () => {
    setField("goals", [...goals, {
      id: makeId(), name: "New Goal", emoji: "other", age: effectiveAge(plan) + 5, amount: 1000000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0,
    }]);
  };
  const removeGoal = (id) => setField("goals", goals.filter((g) => g.id !== id));
  const updateGoal = (id, key, val) => updateListItem("goals", id, key, val);

  /* ── Derived ── */
  const age = effectiveAge(plan);
  const ageIsDerived = isAgeDerived(plan);
  const totalMonthlyIncome = incomes.reduce((s, i) => s + toAnnual(i.amount, i.frequency) / 12, 0);
  const earliestRetireAge = plan.retirementAge;
  const findings = useMemo(() => validate(plan), [plan]);
  const findingsFor = useCallback(
    (prefix) => findings.filter((f) => f.path === prefix || f.path.startsWith(prefix + ".")),
    [findings]);

  /* Everything a person-scoped component needs, with paths relative to that
     person: "holdings.mf" means YOUR holdings for you and Priya's for Priya.
     Components written against the top-level plan work for a member as-is. */
  const scopeFor = useCallback((personId) => {
    const prefix = personPrefix(plan, personId) ?? "";
    return {
      setField: (path, value) => setPersonField(personId, path, value),
      updateListItem: (listPath, id, key, val) =>
        updatePersonListItem(personId, listPath, id, key, val),
      findingsFor: (path) => findingsFor(prefix + path),
      prefix,
    };
  }, [plan, setPersonField, updatePersonListItem, findingsFor]);
  const cplan = useMemo(() => buildContributionPlan(plan), [plan]);
  const premiums = useMemo(() => annualPremium(plan.medical), [plan.medical]);
  const totalHoldings = useMemo(
    () => Object.values(plan.holdings).reduce((s, v) => s + (Number(v) || 0), 0),
    [plan.holdings]);
  const homeGoalAge = useMemo(() => {
    const ages = goals.filter((g) => g.emoji === "home").map((g) => g.age);
    return ages.length ? Math.min(...ages) : null;
  }, [goals]);

  const ratesAreCustom = useMemo(() => {
    const overrides = Object.values(plan.bucketOverrides ?? {});
    if (overrides.some((o) => o?.annualReturn != null)) return true;
    return Object.values(plan.contributions ?? {}).some(
      (c) => c && !Array.isArray(c) && c.annualReturn != null);
  }, [plan.bucketOverrides, plan.contributions]);
  const resetAllRates = () => {
    setPlan((prev) => {
      const next = structuredClone(prev);
      next.bucketOverrides = {};
      for (const [k, c] of Object.entries(next.contributions)) {
        if (c && !Array.isArray(c)) c.annualReturn = null;
      }
      next.contributions.other = next.contributions.other.map((o) => ({ ...o, annualReturn: null }));
      return next;
    });
  };

  /* ══════════════════════════════════════════════════════════════════════
     PROFILE SAVE / LOAD (requires auth)
     ══════════════════════════════════════════════════════════════════════ */

  const { data: session, isDemo } = useAppSession();
  const [savedProfiles, setSavedProfiles] = useState([]);

  const store = useMemo(() => getProfileStore(isDemo), [isDemo]);

  const gatherSettings = useCallback(() => serialize(plan), [plan]);
  const applySettings = useCallback((s) => setPlan(migrate(s)), []);

  const [saveState, setSaveState] = useState({ status: "idle", message: "" });
  const [loadedProfileId, setLoadedProfileId] = useState(null);

  const refreshProfiles = useCallback(async () => {
    if (!session) return;
    const res = await store.list();
    if (res.ok) setSavedProfiles(res.profiles);
  }, [session, store]);

  const saveProfile = useCallback(async (name) => {
    if (!session) return;
    if (hasErrors(findings)) {
      setSaveState({ status: "error", message: "Fix the highlighted fields before saving." });
      return;
    }
    setSaveState({ status: "saving", message: "" });

    const existing = savedProfiles.find((p) => p.id === loadedProfileId && p.name === name)
      ?? savedProfiles.find((p) => p.name === name);
    const settings = gatherSettings();
    const res = existing
      ? await store.update(existing.id, { name, settings })
      : await store.create({ name, settings });

    if (!res.ok) {
      setSaveState({ status: "error", message: res.message });
      return;
    }
    if (res.profile?.id) setLoadedProfileId(res.profile.id);
    setSaveState({ status: "saved", message: res.message });
    if (store.clearsDraftOnSave) clearDraft();
    refreshProfiles();
  }, [session, store, gatherSettings, refreshProfiles, findings, savedProfiles, loadedProfileId]);

  const loadProfile = useCallback((profile) => {
    if (!profile?.settings) {
      setSaveState({ status: "error", message: "That profile could not be read." });
      return;
    }
    try {
      applySettings(profile.settings);
      setLoadedProfileId(profile.id ?? null);
      setSaveState({ status: "idle", message: "" });
    } catch (e) {
      setSaveState({ status: "error", message: "That profile could not be loaded." });
    }
  }, [applySettings]);

  const deleteProfile = useCallback(async (id) => {
    if (!session) return;
    const res = await store.remove(id);
    if (!res.ok) {
      setSaveState({ status: "error", message: res.message });
      return;
    }
    if (id === loadedProfileId) setLoadedProfileId(null);
    refreshProfiles();
  }, [session, store, refreshProfiles, loadedProfileId]);

  /* ── Local working draft ── */
  const keepsLocalDraft = !session || isDemo;
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (!keepsLocalDraft) { clearDraft(); draftLoaded.current = true; return; }
    if (draftLoaded.current) return;
    draftLoaded.current = true;
    const draft = readDraft();
    if (draft) setPlan(migrate(draft));
  }, [keepsLocalDraft]);

  useEffect(() => {
    if (!keepsLocalDraft) return;
    const t = setTimeout(() => writeDraft(plan), 600);
    return () => clearTimeout(t);
  }, [plan, keepsLocalDraft]);

  useEffect(() => {
    if (session) return;
    setSavedProfiles([]);
    setLoadedProfileId(null);
  }, [session]);

  /* ═══════════════════════════════════════════════════════════════════════
     SIMULATION ENGINE
     ═══════════════════════════════════════════════════════════════════════ */

  /* Hoisted so the clamp runs once rather than once per consumer, and so the
     goal-gap pass is guaranteed to be reading the same plan the projection was
     built from. */
  const cleanPlan = useMemo(() => clampPlan(plan), [plan]);
  const simulation = useMemo(() => runProjectionV1(cleanPlan), [cleanPlan]);
  const blendedNow = simulation.data[0]?.blendedReturn ?? plan.expectedXIRR;

  /* Read-only pass over the projection — O(rows + goals), no second engine
     run. See lib/finance/goalgap.mjs. */
  const goalGap = useMemo(
    () => computeGoalGap(cleanPlan, simulation),
    [cleanPlan, simulation]
  );

  /* Derived from goalGap rather than re-scanning the rows: it already knows
     which goals the engine never charges (set past the planning horizon), so
     they can be labelled instead of silently disappearing from the chart. */
  const goalPoints = useMemo(
    () => goalGap.goals
      .filter((g) => g.status !== "outOfHorizon" && g.status !== "inThePast")
      .map((g) => {
        const dp = simulation.data.find((d) => d.age === g.age);
        return dp ? { ...g, netWorth: dp.netWorth } : null;
      })
      .filter(Boolean),
    [goalGap, simulation]
  );

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ══════════════ STICKY HEADER BAR ══════════════ */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 sm:px-6 backdrop-blur-xl"
        style={{ background: 'color-mix(in srgb, var(--bg-primary) 85%, transparent)', borderBottom: '1px solid var(--border-default)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <img
          src={theme === "dark" ? logoLight.src : logoDark.src}
          alt="Financial Independence Planner"
          className="h-10 sm:h-14 w-auto"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-9 h-9 text-[var(--text-muted)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={ICON_SIZE.md} /> : <Moon size={ICON_SIZE.md} />}
          </Button>
          <AuthButton
            onSaveProfile={saveProfile}
            onLoadProfile={loadProfile}
            onDeleteProfile={deleteProfile}
            onRefreshProfiles={refreshProfiles}
            profiles={savedProfiles}
            saveState={saveState}
          />
        </div>
      </header>

      <WizardShell
        plan={plan}
        setField={setField}
        findingsFor={findingsFor}
        age={age}
        ageIsDerived={ageIsDerived}
        currentAge={currentAge}
        setCurrentAge={setCurrentAge}
        lifeExpectancy={lifeExpectancy}
        setLifeExpectancy={setLifeExpectancy}
        incomes={incomes}
        updateIncome={updateIncome}
        addIncome={addIncome}
        removeIncome={removeIncome}
        totalMonthlyIncome={totalMonthlyIncome}
        addMember={addMember}
        removeMember={removeMember}
        scopeFor={scopeFor}
        cleanPlan={cleanPlan}
        premiums={premiums}
        homeGoalAge={homeGoalAge}
        simulation={simulation}
        cplan={cplan}
        makeId={makeId}
        totalHoldings={totalHoldings}
        monthlyInvestment={monthlyInvestment}
        setMonthlyInvestment={setMonthlyInvestment}
        expectedXIRR={expectedXIRR}
        setExpectedXIRR={setExpectedXIRR}
        investmentStepUp={investmentStepUp}
        setInvestmentStepUp={setInvestmentStepUp}
        investSurplus={investSurplus}
        setInvestSurplus={setInvestSurplus}
        postRetireReturn={postRetireReturn}
        setPostRetireReturn={setPostRetireReturn}
        ratesAreCustom={ratesAreCustom}
        blendedNow={blendedNow}
        resetAllRates={resetAllRates}
        earliestRetireAge={earliestRetireAge}
        exitTaxRate={exitTaxRate}
        goals={goals}
        addGoal={addGoal}
        removeGoal={removeGoal}
        updateGoal={updateGoal}
        goalPoints={goalPoints}
        goalGap={goalGap}
      />
    </div>
  );
}
