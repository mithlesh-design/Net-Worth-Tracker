"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import AuthButton from "@/components/AuthButton";
import { useTheme } from "@/components/ThemeProvider";
import {
  Wallet,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  X,
  Plus,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Customized,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS — now live in lib/finance so they can be unit tested outside React.
   ═══════════════════════════════════════════════════════════════════════════ */

import { fmt, fmtAxis, toWords, toAnnual, monthlyEquivalent, numToWordsIndian } from "@/lib/finance/format.mjs";
import { calcIncomeTax } from "@/lib/finance/tax.mjs";
import { calcEMI } from "@/lib/finance/loans.mjs";
import { runProjectionV1 } from "@/lib/finance/projection.mjs";
import { effectiveAge, isAgeDerived, todayISO } from "@/lib/finance/age.mjs";
import { annualPremium } from "@/lib/finance/insurance.mjs";
import { buildContributionPlan } from "@/lib/finance/contributions.mjs";
import { BUCKET_DEFS, PPF_ANNUAL_CAP, ASSUMPTIONS_AS_OF } from "@/lib/finance/assumptions.mjs";
import { migrate } from "@/lib/profile/migrate.mjs";
import { serialize, FIRST_RUN_V0 } from "@/lib/profile/schema.mjs";
import { validate, clampPlan, hasErrors } from "@/lib/profile/validate.mjs";

const GOAL_EMOJIS = { home: "🏠", education: "🎓", car: "🚗", wedding: "💒", travel: "✈️", retirement: "🏖️", other: "🎯" };

import {
  SectionCard, CollapsibleSection, SliderInput, ToggleSwitch,
  InfoStrip, SegmentedControl, ItemCard, AddItemButton,
  TextField, DateField, YesNoField, DerivedStat, FieldError,
} from "@/components/ui";
import PersonalDetails from "@/components/sections/PersonalDetails";
import MedicalInsurance from "@/components/sections/MedicalInsurance";
import MonthlyInvestments from "@/components/sections/MonthlyInvestments";
import CurrentHoldings from "@/components/sections/CurrentHoldings";
import LifeInsurance from "@/components/sections/LifeInsurance";
import MonthlySummary from "@/components/sections/MonthlySummary";

/* ═══════════════════════════════════════════════════════════════════════════
   TOOLTIP
   ═══════════════════════════════════════════════════════════════════════════ */

function NetWorthTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="backdrop-blur-md rounded-2xl shadow-xl border px-4 py-3 min-w-[240px] text-xs"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-black" style={{ color: 'var(--text-primary)' }}>Age {d.age} · {d.year}</span>
        {d.isRetired && <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold" style={{ background: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)' }}>Retired</span>}
        {d.deficit && <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold flex items-center gap-0.5" style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}><AlertTriangle size={8} />Deficit</span>}
      </div>
      <div className="text-base font-black text-emerald-600 mb-2">{fmt(d.netWorth)}</div>
      <div className="space-y-1 text-[0.65rem]">
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Gross Income</span><span className="text-blue-500 font-semibold">{fmt(d.grossIncome)}</span></div>
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Income Tax</span><span className="text-red-400 font-semibold">−{fmt(d.incomeTax)}</span></div>
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Post-Tax Income</span><span className="text-blue-600 font-semibold">{fmt(d.postTaxIncome)}</span></div>
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Expenses</span><span className="text-orange-500 font-semibold">−{fmt(d.annualExpense)}</span></div>
        {d.insurancePremium > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Insurance Premium</span><span className="text-orange-400 font-semibold">−{fmt(d.insurancePremium)}</span></div>}
        {d.totalEMI > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Loan EMIs</span><span className="text-rose-400 font-semibold">−{fmt(d.totalEMI)}</span></div>}
        {d.maintenanceCost > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Maintenance</span><span className="text-amber-500 font-semibold">−{fmt(d.maintenanceCost)}</span></div>}
        <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-secondary)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Available Cash</span>
          <span className={`font-bold ${d.availableCash < 0 ? "text-red-500" : "text-emerald-500"}`}>{fmt(d.availableCash)}</span>
        </div>
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Invested</span><span className="text-sky-500 font-semibold">+{fmt(d.invested)}</span></div>
        {d.payrollContribution > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>… from payroll</span><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt(d.payrollContribution)}</span></div>}
        {d.contributionShortfall > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Contribution Shortfall</span><span className="text-red-400 font-semibold">{fmt(d.contributionShortfall)}</span></div>}
        {d.surplusSpent > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Surplus Spent</span><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt(d.surplusSpent)}</span></div>}
        {d.goalCostGross > 0 && <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-secondary)' }}><span style={{ color: 'var(--text-secondary)' }}>Goals (incl. tax)</span><span className="text-amber-500 font-semibold">−{fmt(d.goalCostGross)}</span></div>}
        {d.totalPropertyValue > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Property Assets</span><span className="text-amber-500 font-semibold">{fmt(d.totalPropertyValue)}</span></div>}
        {d.totalLoanOutstanding > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Loans</span><span className="text-rose-400 font-semibold">−{fmt(d.totalLoanOutstanding)}</span></div>}
        {d.lockedNW > 0 && (
          <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-secondary)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Liquid / Locked</span>
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt(d.liquidNW)} / {fmt(d.lockedNW)}</span>
          </div>
        )}
        {d.unfundedThisYear > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Unfunded this year</span><span className="text-red-500 font-semibold">{fmt(d.unfundedThisYear)}</span></div>}
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Blended Return</span><span style={{ color: 'var(--text-secondary)' }}>{Number(d.returnRate).toFixed(1)}%</span></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GOAL OVERLAY
   ═══════════════════════════════════════════════════════════════════════════ */

function GoalOverlay({ goals, projection, xScale, yScale }) {
  return (
    <>
      {goals.map((goal) => {
        const pt = projection.find((p) => p.age === goal.age);
        if (!pt) return null;
        const cx = xScale(pt.age);
        const cy = yScale(Math.max(0, pt.netWorth));
        if (!isFinite(cx) || !isFinite(cy)) return null;
        const R = 14, STEM = 6, by = cy - STEM - R;
        return (
          <g key={goal.id}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - STEM} stroke="#f59e0b" strokeWidth={1.5} strokeOpacity={0.7} />
            <circle cx={cx} cy={cy} r={3.5} fill="#f59e0b" />
            <circle cx={cx} cy={by} r={R} fill="var(--goal-marker-fill)" stroke="#f59e0b" strokeWidth={1.5} />
            <foreignObject x={cx - R} y={by - R} width={R * 2} height={R * 2} style={{ overflow: "visible" }}>
              <div style={{ width: R * 2, height: R * 2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, lineHeight: 1, userSelect: "none" }}>
                {GOAL_EMOJIS[goal.emoji] || "🎯"}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </>
  );
}

function GoalOverlayCustomized(props) {
  const xAxis = props.xAxisMap?.[Object.keys(props.xAxisMap || {})[0]];
  const yAxis = props.yAxisMap?.[Object.keys(props.yAxisMap || {})[0]];
  if (!xAxis?.scale || !yAxis?.scale) return null;
  return <GoalOverlay goals={props.goals} projection={props.projection} xScale={xAxis.scale} yScale={yAxis.scale} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED Y-AXIS DOMAIN HOOK (Fix 6)
   ═══════════════════════════════════════════════════════════════════════════ */

function useAnimatedDomain(targetMax, duration = 400) {
  const [current, setCurrent] = useState(targetMax);
  const animRef = useRef(null);
  const prevRef = useRef(targetMax);

  useEffect(() => {
    const from = prevRef.current;
    const to = targetMax;
    if (Math.abs(from - to) < 1000) { setCurrent(to); prevRef.current = to; return; }
    const start = performance.now();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(from + (to - from) * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        prevRef.current = to;
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [targetMax, duration]);

  return current;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function FinancialPlanner() {

  /* ── Theme ── */
  const { theme, toggleTheme } = useTheme();

  /* ── The whole planner is one object ──
     Previously 18 separate useState hooks, mirrored by hand in gatherSettings
     and applySettings and listed by hand in the projection's dependency array.
     At 38+ fields that is three places to forget, and a missed dependency
     produces a chart that silently stops updating. One object, one dep. */
  const [plan, setPlan] = useState(() => migrate(FIRST_RUN_V0));

  /* Writes one field by dotted path, e.g. setField("expenses.rent", 12000). */
  const setField = useCallback((path, value) => {
    setPlan((prev) => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let node = next;
      for (const k of keys.slice(0, -1)) node = node[k];
      node[keys[keys.length - 1]] = value;
      return next;
    });
  }, []);

  const updateListItem = useCallback((listPath, id, key, val) => {
    setPlan((prev) => {
      const next = structuredClone(prev);
      const keys = listPath.split(".");
      let node = next;
      for (const k of keys.slice(0, -1)) node = node[k];
      const last = keys[keys.length - 1];
      node[last] = node[last].map((it) => (it.id === id ? { ...it, [key]: val } : it));
      return next;
    });
  }, []);

  /* Read-only aliases so the existing JSX keeps working unchanged. */
  const {
    currentAge, lifeExpectancy, incomes, inflationRate, lifestyleCreep,
    investmentStepUp, expectedXIRR, investSurplus, postRetireReturn,
    exitTaxRate, goals,
  } = plan;
  const monthlyExpense = plan.expenses.household + plan.expenses.rent;
  const currentNW = plan.holdings.unallocated;
  const monthlyInvestment = plan.legacy.monthlyInvestment;

  const setCurrentAge = (v) => setField("currentAge", v);
  const setLifeExpectancy = (v) => setField("lifeExpectancy", v);
  const setInflationRate = (v) => setField("inflationRate", v);
  const setLifestyleCreep = (v) => setField("lifestyleCreep", v);
  const setInvestmentStepUp = (v) => setField("investmentStepUp", v);
  const setExpectedXIRR = (v) => setField("expectedXIRR", v);
  const setInvestSurplus = (v) => setField("investSurplus", v);
  const setPostRetireReturn = (v) => setField("postRetireReturn", v);
  const setExitTaxRate = (v) => setField("exitTaxRate", v);
  const setMonthlyExpense = (v) => setField("expenses.household", v);
  const setCurrentNW = (v) => setField("holdings.unallocated", v);
  const setMonthlyInvestment = (v) => setField("legacy.monthlyInvestment", v);
  const setIncomes = (v) => setField("incomes", v);
  const setGoals = (v) => setField("goals", v);

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newInc, setNewInc] = useState({ name: "Bonus", amount: 300000, frequency: "yearly", basis: "gross", role: "other", growthRate: 5, retireAge: 55 });

  /* Monotonic ids. Date.now() collides on a fast double-click, which produces
     duplicate React keys and two rows that edit together. */
  const nextId = useRef(Date.now());
  const makeId = () => ++nextId.current;

  /* ── Income CRUD ── */
  const addIncome = () => {
    setField("incomes", [...incomes, { ...newInc, id: makeId() }]);
    setShowAddIncome(false);
    setNewInc({ name: "Bonus", amount: 300000, frequency: "yearly", basis: "gross", role: "other", growthRate: 5, retireAge: 55 });
  };
  const removeIncome = (id) => setField("incomes", incomes.filter((i) => i.id !== id));
  const updateIncome = (id, key, val) => updateListItem("incomes", id, key, val);

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
  /* Gross and take-home are partitioned before tax, exactly as the engine does. */
  const grossAnnual = incomes.filter((i) => i.basis !== "takehome")
    .reduce((s, i) => s + toAnnual(i.amount, i.frequency), 0);
  const takeHomeAnnual = incomes.filter((i) => i.basis === "takehome")
    .reduce((s, i) => s + toAnnual(i.amount, i.frequency), 0);
  const taxOnGross = calcIncomeTax(grossAnnual);
  /* Retirement is one explicit age. v0 had the tiles use min(retireAge) while
     the engine used every(), so the two disagreed for multi-income profiles. */
  const earliestRetireAge = plan.retirementAge;
  const findings = useMemo(() => validate(plan), [plan]);
  const findingsFor = useCallback(
    (prefix) => findings.filter((f) => f.path === prefix || f.path.startsWith(prefix + ".")),
    [findings]);
  const cplan = useMemo(() => buildContributionPlan(plan), [plan]);
  const premiums = useMemo(() => annualPremium(plan.medical), [plan.medical]);
  const totalHoldings = useMemo(
    () => Object.values(plan.holdings).reduce((s, v) => s + (Number(v) || 0), 0),
    [plan.holdings]);
  const homeGoalAge = useMemo(() => {
    const ages = goals.filter((g) => g.emoji === "home").map((g) => g.age);
    return ages.length ? Math.min(...ages) : null;
  }, [goals]);

  /* True once any per-instrument return differs from the single XIRR slider, at
     which point that slider no longer describes the portfolio and is replaced
     by the blended read-out rather than silently losing its effect. */
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

  const { data: session } = useSession();
  const [savedProfiles, setSavedProfiles] = useState([]);

  /* One deep clone in, one migrate out. Every field is persisted automatically,
     so a newly added field can no longer be saved but not loaded (or vice
     versa) because someone updated one list and not the other. Derived totals
     are never stored, so a saved total cannot drift from its parts. */
  const gatherSettings = useCallback(() => serialize(plan), [plan]);

  /* migrate() on load makes a v0 profile safe without a backfill, and is
     idempotent so re-loading is harmless. */
  const applySettings = useCallback((s) => setPlan(migrate(s)), []);

  const refreshProfiles = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) setSavedProfiles(await res.json());
    } catch (e) { /* silent */ }
  }, [session]);

  const saveProfile = useCallback(async (name) => {
    if (!session) return;
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, settings: gatherSettings() }),
      });
      if (res.ok) refreshProfiles();
    } catch (e) { /* silent */ }
  }, [session, gatherSettings, refreshProfiles]);

  const loadProfile = useCallback((profile) => {
    if (profile?.settings) applySettings(profile.settings);
  }, [applySettings]);

  const deleteProfile = useCallback(async (id) => {
    if (!session) return;
    try {
      await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      refreshProfiles();
    } catch (e) { /* silent */ }
  }, [session, refreshProfiles]);

  /* ═══════════════════════════════════════════════════════════════════════
     SIMULATION ENGINE
     ═══════════════════════════════════════════════════════════════════════ */

  /* One dependency. clampPlan is a defence against a hand-edited stored profile
     reaching the engine with, say, a 100% exit tax; the UI reports the problem
     separately rather than silently correcting it. */
  const simulation = useMemo(() => runProjectionV1(clampPlan(plan)), [plan]);
  const blendedNow = simulation.data[0]?.blendedReturn ?? plan.expectedXIRR;

  /* ── Derived ── */
  const retirePoint = simulation.data.find((d) => d.age === earliestRetireAge);
  const lastPoint = simulation.data[simulation.data.length - 1];
  const firstDeficitAge = simulation.data.find((d) => d.deficit)?.age;
  const constrainedYears = simulation.data.filter((d) => d.constrained || d.deficit).length;
  const shortfallYears = simulation.data.filter((d) => d.contributionShortfall > 0).length;
  const goalPoints = goals.map((g) => {
    const dp = simulation.data.find((d) => d.age === g.age);
    return dp ? { ...g, netWorth: dp.netWorth } : null;
  }).filter(Boolean);

  // Fix 6: Animated Y-axis domain
  const rawPeak = simulation.data.reduce((max, d) => Math.max(max, d.netWorth), 0);
  const yMax = useAnimatedDomain(rawPeak * 1.1);

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ══════════════ STICKY HEADER BAR ══════════════ */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Financial Independence Planner</h1>
            <p className="text-[0.55rem]" style={{ color: 'var(--text-secondary)' }}>Property · Investments · Freedom</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <AuthButton
            onSaveProfile={saveProfile}
            onLoadProfile={loadProfile}
            onDeleteProfile={deleteProfile}
            onRefreshProfiles={refreshProfiles}
            profiles={savedProfiles}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-4 px-3 py-5 lg:flex-row lg:px-5 lg:py-6">

        {/* ══════════════ LEFT SIDEBAR ══════════════ */}
        <aside className="flex w-full flex-col gap-3 lg:w-[380px] lg:shrink-0 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1 lg:pb-6 scrollbar-thin">

          {/* Personal Details — client fields 1-2 */}
          <PersonalDetails plan={plan} setField={setField} findingsFor={findingsFor} />

          {/* Timeline */}
          <SectionCard title="Timeline">
            <div className="space-y-3">
              {/* Age has ONE source. When a date of birth is set the slider is
                  replaced by the derived figure, so the two can never disagree. */}
              {ageIsDerived ? (
                <>
                  <DerivedStat label="Current Age" value={`${age} yrs`} sub="from your date of birth" />
                  <button onClick={() => setField("personal.dob", null)}
                    className="text-[0.55rem] underline" style={{ color: 'var(--text-muted)' }}>
                    Clear date of birth to set age manually
                  </button>
                </>
              ) : (
                <SliderInput label="Current Age" value={currentAge} onChange={setCurrentAge} min={18} max={65} suffix=" yrs" />
              )}
              <SliderInput label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} min={60} max={100} suffix=" yrs" />
              <SliderInput label="Retirement Age" value={plan.retirementAge}
                onChange={(v) => setField("retirementAge", v)} min={age} max={80} suffix=" yrs" />
              <FieldError findings={[...findingsFor("currentAge"), ...findingsFor("lifeExpectancy"), ...findingsFor("retirementAge")]} />
            </div>
          </SectionCard>

          {/* Income Sources */}
          <CollapsibleSection title="Income Sources" badge={`${incomes.length}`}>
            {incomes.map((inc) => (
              <div key={inc.id} className="rounded-xl border p-3 space-y-3"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: 'var(--info-emerald-bg)' }}><Wallet size={11} className="text-emerald-500" /></div>
                    <input type="text" value={inc.name} onChange={(e) => updateIncome(inc.id, "name", e.target.value)}
                      className="text-xs font-bold bg-transparent outline-none w-24" style={{ color: 'var(--text-primary)' }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.6rem] font-bold text-emerald-500">{fmt(toAnnual(inc.amount, inc.frequency))}/yr</span>
                    {incomes.length > 1 && <button onClick={() => removeIncome(inc.id)} className="hover:text-rose-400" style={{ color: 'var(--text-muted)' }}><X size={12} /></button>}
                  </div>
                </div>
                <SliderInput label={`Amount (${inc.frequency})`} value={inc.amount} onChange={(v) => updateIncome(inc.id, "amount", v)}
                  min={0} max={inc.frequency === "yearly" ? 10000000 : inc.frequency === "quarterly" ? 2500000 : 1000000} step={5000} prefix="₹" showWords />
                {/* Fix 2: Frequency selector */}
                <div>
                  <label className="text-[0.63rem] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Frequency</label>
                  <div className="flex gap-1.5">
                    {["monthly", "quarterly", "yearly"].map((f) => (
                      <button key={f} onClick={() => updateIncome(inc.id, "frequency", f)}
                        className={`flex-1 py-1 rounded-lg text-[0.6rem] font-bold transition ${inc.frequency === f ? "bg-emerald-500 text-white" : ""}`}
                        style={inc.frequency === f ? {} : { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gross vs take-home decides whether income tax is applied and
                    whether an EPF deduction would be subtracted twice. */}
                <SegmentedControl
                  label="This amount is"
                  options={[
                    { value: "gross", label: "Gross (CTC)" },
                    { value: "takehome", label: "Take-home" },
                  ]}
                  value={inc.basis ?? "gross"}
                  onChange={(v) => updateIncome(inc.id, "basis", v)}
                />
                <p className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>
                  {inc.basis === "takehome"
                    ? "What reaches your bank. Not taxed again, and growth applies to a net figure, so the effective tax rate is held constant."
                    : "Before income tax and EPF."}
                </p>
                <SliderInput
                  label={inc.role === "salary" ? "Average Salary Growth (annual)" : "Annual Growth"}
                  value={inc.growthRate} onChange={(v) => updateIncome(inc.id, "growthRate", v)}
                  min={0} max={25} step={0.5} suffix="%" />
                <SliderInput label="Retire Age" value={inc.retireAge} onChange={(v) => updateIncome(inc.id, "retireAge", v)} min={age} max={75} suffix=" yrs" />
                <FieldError findings={findingsFor(`incomes.${incomes.indexOf(inc)}`)} />
              </div>
            ))}
            {showAddIncome ? (
              <div className="rounded-xl border p-3 space-y-3"
                style={{ borderColor: 'var(--info-emerald-border)', background: 'var(--info-emerald-bg)' }}>
                <div className="text-[0.58rem] font-bold uppercase tracking-widest text-emerald-600">New Income</div>
                <input type="text" value={newInc.name} onChange={(e) => setNewInc({ ...newInc, name: e.target.value })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  placeholder="Name" />
                <SliderInput label="Amount" value={newInc.amount} onChange={(v) => setNewInc({ ...newInc, amount: v })}
                  min={0} max={newInc.frequency === "yearly" ? 10000000 : 1000000} step={5000} prefix="₹" showWords />
                <div>
                  <label className="text-[0.63rem] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Frequency</label>
                  <div className="flex gap-1.5">
                    {["monthly", "quarterly", "yearly"].map((f) => (
                      <button key={f} onClick={() => setNewInc({ ...newInc, frequency: f })}
                        className={`flex-1 py-1 rounded-lg text-[0.6rem] font-bold transition ${newInc.frequency === f ? "bg-emerald-500 text-white" : ""}`}
                        style={newInc.frequency === f ? {} : { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <SliderInput label="Growth %" value={newInc.growthRate} onChange={(v) => setNewInc({ ...newInc, growthRate: v })} min={0} max={25} step={0.5} suffix="%" />
                <SliderInput label="Retire Age" value={newInc.retireAge} onChange={(v) => setNewInc({ ...newInc, retireAge: v })} min={currentAge} max={75} suffix=" yrs" />
                <div className="flex gap-2">
                  <button onClick={addIncome} className="flex-1 rounded-lg bg-emerald-500 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition">Add</button>
                  <button onClick={() => setShowAddIncome(false)} className="rounded-lg border px-3 py-1.5 text-xs transition"
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddIncome(true)} className="w-full rounded-xl border border-dashed py-2.5 flex items-center justify-center gap-1.5 text-emerald-500 text-xs font-semibold transition"
                style={{ borderColor: 'var(--info-emerald-border)', background: 'var(--info-emerald-bg)' }}>
                <Plus size={13} /> Add Income Source
              </button>
            )}
            {/* Totals */}
            <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-secondary)' }}>
              <DerivedStat label="Total Monthly Income" value={`${fmt(totalMonthlyIncome)}/mo`} />
              <DerivedStat label="Total Annual Income" value={fmt(totalMonthlyIncome * 12)}
                sub="before income tax" tone="muted" />
            </div>

            {/* Tax info — only gross sources are taxed. Summing calcIncomeTax
                per source would grant the rebate and deduction once each. */}
            <div className="rounded-lg border px-3 py-2 text-[0.6rem] space-y-1"
              style={{ background: 'var(--info-blue-bg)', borderColor: 'var(--info-blue-border)', color: 'var(--info-blue-text)' }}>
              <div className="font-bold">Income Tax (New Regime 2024-25)</div>
              <div>Gross: {fmt(grossAnnual)} → Tax: {fmt(taxOnGross)} → Post-tax: {fmt(grossAnnual - taxOnGross)}/yr</div>
              {takeHomeAnnual > 0 && (
                <div>Take-home sources: {fmt(takeHomeAnnual)}/yr, not taxed again.</div>
              )}
            </div>
          </CollapsibleSection>

          {/* Budget — client fields 6-7 */}
          <CollapsibleSection title="Budget & Expenses">
            <SliderInput label="Household expenses (₹/month)" value={plan.expenses.household}
              onChange={(v) => setField("expenses.household", v)}
              min={0} max={500000} step={5000} prefix="₹" showWords
              warn={findingsFor("expenses.household").length > 0} />
            <InfoStrip tone="amber">
              Day-to-day living only. Exclude rent, insurance premiums, investments and
              loan EMIs — those are captured in their own sections.
            </InfoStrip>
            <SliderInput label="Rent (₹/month)" value={plan.expenses.rent}
              onChange={(v) => setField("expenses.rent", v)}
              min={0} max={500000} step={1000} prefix="₹" showWords
              warn={findingsFor("expenses.rent").length > 0} />

            <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-secondary)' }}>
              <DerivedStat label="Total Monthly Living Expenses" value={fmt(monthlyExpense)}
                sub={`${fmt(monthlyExpense * 12)}/yr`} />
              <DerivedStat label="Insurance premium" value={`${fmt(premiums.total / 12)}/mo`}
                sub="from Medical Insurance" tone="muted" />
            </div>

            <SliderInput label="Inflation Rate" value={inflationRate} onChange={setInflationRate} min={0} max={15} step={0.5} suffix="%" />
            <SliderInput label="Lifestyle Creep" value={lifestyleCreep} onChange={setLifestyleCreep} min={0} max={10} step={0.5} suffix="%" />
            <SliderInput label="Medical Inflation" value={plan.medicalInflation}
              onChange={(v) => setField("medicalInflation", v)} min={0} max={20} step={0.5} suffix="%" />

            {plan.expenses.rent > 0 && (
              <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
                <ToggleSwitch value={plan.stopRentOnHomePurchase}
                  onChange={(v) => setField("stopRentOnHomePurchase", v)}
                  label="Stop rent after a home purchase" />
                <p className="text-[0.55rem] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {homeGoalAge !== null
                    ? (plan.stopRentOnHomePurchase
                        ? `Rent stops at age ${homeGoalAge}, when your home goal completes.`
                        : `Rent continues alongside the EMI from age ${homeGoalAge}.`)
                    : "No home goal set, so this has no effect yet."}
                </p>
              </div>
            )}

            <InfoStrip tone="amber">
              Expenses grow at <strong>{(inflationRate + lifestyleCreep).toFixed(1)}%</strong>/yr
            </InfoStrip>
          </CollapsibleSection>

          {/* Medical Insurance — client fields 8-9 */}
          <MedicalInsurance plan={plan} setField={setField} findingsFor={findingsFor} />

          {/* Monthly Investments — client fields 10-16 */}
          <MonthlyInvestments plan={plan} setField={setField} findingsFor={findingsFor}
            cplan={cplan} makeId={makeId} />

          {/* Current Holdings — client fields 17-23 */}
          <CurrentHoldings plan={plan} setField={setField} findingsFor={findingsFor}
            totalHoldings={totalHoldings} />

          {/* Life Insurance — client field 24 */}
          <LifeInsurance plan={plan} setField={setField} findingsFor={findingsFor} />

          {/* Investment Strategy */}
          <CollapsibleSection title="Investment Strategy">
            {/* The aggregate net worth is now derived from the holdings it
                always represented. It is never added on top of them. */}
            <DerivedStat label="Starting Portfolio" value={fmt(totalHoldings)}
              sub="total of Current Holdings above" />

            {cplan.useDetailed ? (
              <>
                <DerivedStat label="Monthly Contributions" value={fmt(cplan.detailedMonthly)}
                  sub="from Monthly Investments" />
                <InfoStrip tone="blue">
                  Your detailed contributions replace the aggregate SIP target. They are
                  never added together.
                </InfoStrip>
              </>
            ) : (
              <SliderInput label="Monthly SIP (Target)" value={monthlyInvestment} onChange={setMonthlyInvestment} min={0} max={500000} step={5000} prefix="₹" showWords />
            )}

            <SliderInput label="Annual Step-Up" value={investmentStepUp} onChange={setInvestmentStepUp} min={0} max={30} suffix="%" />

            {ratesAreCustom ? (
              <>
                <DerivedStat label="Blended Portfolio Return" value={`${blendedNow.toFixed(1)}%`}
                  sub="weighted by what you actually hold" />
                <button onClick={resetAllRates}
                  className="w-full rounded-lg border py-1.5 text-[0.6rem] font-bold transition"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
                  Set all instruments to {expectedXIRR}%
                </button>
              </>
            ) : (
              <SliderInput label="Expected XIRR (Working)" value={expectedXIRR} onChange={setExpectedXIRR} min={1} max={25} step={0.5} suffix="%" />
            )}

            <SliderInput label="Post-Retirement Return" value={postRetireReturn} onChange={setPostRetireReturn} min={1} max={15} step={0.5} suffix="%" />

            <InfoStrip tone="amber">
              Each instrument uses its own assumed return, editable in Monthly
              Investments. These are estimates, not guaranteed rates. Post-retirement
              return applies as a cap, so a contractual PPF or EPF rate is not reduced.
              Assumptions checked {ASSUMPTIONS_AS_OF}.
            </InfoStrip>
            {/* Fix 1: Surplus toggle */}
            <div className="rounded-xl border p-3 space-y-2"
              style={{ background: 'var(--info-sky-bg)', borderColor: 'var(--info-sky-border)' }}>
              <ToggleSwitch value={investSurplus} onChange={setInvestSurplus} label="Invest all surplus cash" />
              <p className="text-[0.55rem]" style={{ color: 'var(--text-secondary)' }}>
                {investSurplus
                  ? "All cash after expenses/EMIs goes into investments."
                  : "Only the Target SIP is invested. Remaining surplus is spent (lifestyle)."}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2 text-[0.6rem] flex items-center gap-1.5"
              style={{ background: 'var(--info-blue-bg)', borderColor: 'var(--info-blue-border)', color: 'var(--info-blue-text)' }}>
              <ShieldCheck size={10} /> Returns switch to {postRetireReturn}% at age {earliestRetireAge}
            </div>
          </CollapsibleSection>

          {/* Tax Wall */}
          <CollapsibleSection title="Tax Wall (LTCG)" defaultOpen={false}>
            <SliderInput label="Effective Exit Tax" value={exitTaxRate} onChange={setExitTaxRate} min={0} max={30} step={0.5} suffix="%" />
            <div className="rounded-lg border px-3 py-2 text-[0.6rem] space-y-1"
              style={{ background: 'var(--info-rose-bg)', borderColor: 'var(--info-rose-border)', color: 'var(--info-rose-text)' }}>
              <div>Goal withdrawals grossed-up: Amount / (1−{exitTaxRate}%).</div>
              <div>₹10L goal costs <strong>{fmt(1000000 / (1 - exitTaxRate / 100))}</strong> from portfolio.</div>
            </div>
          </CollapsibleSection>

          {/* Fix 8: Financial Goals (unified with property & loan toggle) */}
          <CollapsibleSection title="Financial Goals" badge={`${goals.length}`}>
            {goals.map((g) => {
              const isHome = g.emoji === "home";
              const loanAmt = g.hasLoan ? g.amount * (1 - g.downPaymentPct / 100) : 0;
              const emi = g.hasLoan ? calcEMI(loanAmt, g.loanRate, g.loanTenure) : 0;
              return (
                <div key={g.id} className="rounded-xl border p-3 space-y-3"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{GOAL_EMOJIS[g.emoji] || "🎯"}</span>
                      <input type="text" value={g.name} onChange={(e) => updateGoal(g.id, "name", e.target.value)}
                        className="text-xs font-bold bg-transparent outline-none w-28" style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <button onClick={() => removeGoal(g.id)} className="hover:text-rose-400" style={{ color: 'var(--text-muted)' }}><X size={12} /></button>
                  </div>

                  {/* Emoji type selector */}
                  <div>
                    <label className="text-[0.55rem] mb-1 block" style={{ color: 'var(--text-secondary)' }}>Type</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(GOAL_EMOJIS).map(([k, v]) => (
                        <button key={k} onClick={() => updateGoal(g.id, "emoji", k)}
                          className={`h-7 w-7 rounded-lg text-sm flex items-center justify-center transition ${g.emoji === k ? "bg-amber-100 ring-2 ring-amber-400" : ""}`}
                          style={g.emoji === k ? {} : { background: 'var(--bg-tertiary)' }}>{v}</button>
                      ))}
                    </div>
                  </div>

                  <SliderInput label="Target Age" value={g.age} onChange={(v) => updateGoal(g.id, "age", v)} min={currentAge} max={lifeExpectancy} suffix=" yrs" />
                  <SliderInput label="Total Cost" value={g.amount} onChange={(v) => updateGoal(g.id, "amount", v)} min={100000} max={100000000} step={100000} prefix="₹" showWords />

                  {/* Loan toggle */}
                  <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
                    <ToggleSwitch value={g.hasLoan} onChange={(v) => updateGoal(g.id, "hasLoan", v)} label="Finance via Loan" />
                  </div>

                  {g.hasLoan && (
                    <div className="space-y-3 rounded-lg border p-3"
                      style={{ background: 'var(--info-rose-bg)', borderColor: 'var(--info-rose-border)' }}>
                      <SliderInput label="Down Payment %" value={g.downPaymentPct} onChange={(v) => updateGoal(g.id, "downPaymentPct", v)} min={5} max={80} step={5} suffix="%" />
                      <SliderInput label="Loan Interest Rate" value={g.loanRate} onChange={(v) => updateGoal(g.id, "loanRate", v)} min={5} max={15} step={0.25} suffix="%" />
                      <SliderInput label="Loan Tenure" value={g.loanTenure} onChange={(v) => updateGoal(g.id, "loanTenure", v)} min={1} max={30} suffix=" yrs" />
                      <div className="text-[0.55rem] space-y-0.5" style={{ color: 'var(--info-rose-text)' }}>
                        <div>Loan: {fmt(loanAmt)} · EMI: {fmt(emi)}/mo</div>
                        <div>Down payment (gross of tax): {fmt((g.amount * g.downPaymentPct / 100) / (1 - exitTaxRate / 100))}</div>
                      </div>
                    </div>
                  )}

                  {!g.hasLoan && (
                    <div className="text-[0.55rem]" style={{ color: 'var(--text-secondary)' }}>
                      Gross withdrawal (incl. {exitTaxRate}% tax): <strong style={{ color: 'var(--text-primary)' }}>{fmt(g.amount / (1 - exitTaxRate / 100))}</strong>
                    </div>
                  )}

                  {/* Home-specific: appreciation + maintenance */}
                  {isHome && (
                    <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--border-secondary)' }}>
                      <div className="text-[0.55rem] font-bold text-amber-600 uppercase tracking-wider">Home-Specific</div>
                      <SliderInput label="Property Appreciation" value={g.appreciationRate} onChange={(v) => updateGoal(g.id, "appreciationRate", v)} min={0} max={15} step={0.5} suffix="%" />
                      <SliderInput label="Annual Maintenance %" value={g.maintenancePct} onChange={(v) => updateGoal(g.id, "maintenancePct", v)} min={0} max={5} step={0.25} suffix="%" />
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addGoal} className="w-full rounded-xl border border-dashed py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
              style={{ borderColor: 'var(--info-violet-border)', background: 'var(--info-violet-bg)', color: 'var(--info-violet-text)' }}>
              <Plus size={13} /> Add Goal
            </button>
          </CollapsibleSection>

          <div className="text-center py-3">
            <p className="text-[0.5rem]" style={{ color: 'var(--text-muted)' }}>Not financial advice · Consult a SEBI-registered advisor</p>
          </div>
        </aside>

        {/* ══════════════ RIGHT — CHART ══════════════ */}
        <section className="flex flex-1 flex-col gap-4 min-w-0">

          <MonthlySummary plan={plan} cplan={cplan} premiums={premiums}
            totalHoldings={totalHoldings} simulation={simulation}
            totalMonthlyIncome={totalMonthlyIncome} />

          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="text-[0.55rem] font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--text-secondary)' }}>Wealth Projection</div>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>Net Worth Over Time</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                XIRR <span className="text-emerald-500 font-bold">{expectedXIRR}%</span> →
                Post-retire <span className="text-blue-500 font-bold">{postRetireReturn}%</span> ·
                Step-Up <span className="text-sky-500 font-bold">+{investmentStepUp}%</span>/yr ·
                Tax <span className="text-rose-400 font-bold">{exitTaxRate}%</span> ·
                Surplus: <span className="text-violet-500 font-bold">{investSurplus ? "Invest" : "Spend"}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {simulation.fiAge && (
                <div className="rounded-full px-3 py-1 flex items-center gap-1.5"
                  style={{ background: 'var(--badge-emerald-bg)', borderColor: 'var(--info-emerald-border)', border: '1px solid var(--info-emerald-border)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[0.65rem] font-bold" style={{ color: 'var(--badge-emerald-text)' }}>FI at Age {simulation.fiAge}</span>
                </div>
              )}
              {constrainedYears > 0 && (
                <div className="rounded-full px-3 py-1 flex items-center gap-1.5"
                  style={{ background: 'var(--badge-red-bg)', borderColor: 'var(--info-red-border)', border: '1px solid var(--info-red-border)' }}>
                  <AlertTriangle size={10} className="text-red-400" />
                  <span className="text-[0.65rem] font-bold" style={{ color: 'var(--badge-red-text)' }}>{constrainedYears} yrs deficit</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Chart */}
          <div className="relative overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-6 flex-1"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', boxShadow: '0 1px 2px var(--shadow-color)' }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[0.58rem] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Net Worth at Age {lifeExpectancy}</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-2xl font-black sm:text-3xl" style={{ color: 'var(--text-primary)' }}>{lastPoint ? fmt(lastPoint.netWorth) : "—"}</span>
                  {lastPoint && lastPoint.netWorthRaw > simulation.openingPortfolio && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.63rem] font-bold"
                      style={{ background: 'var(--badge-emerald-bg)', color: 'var(--badge-emerald-text)' }}>
                      <ArrowUpRight size={11} /> +{fmt(lastPoint.netWorthRaw - simulation.openingPortfolio)}
                    </span>
                  )}
                  {lastPoint && lastPoint.netWorthRaw <= 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.63rem] font-bold"
                      style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                      <AlertTriangle size={11} /> Depleted
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[0.55rem] italic" style={{ color: 'var(--text-secondary)' }}>{lastPoint ? numToWordsIndian(Math.max(0, lastPoint.netWorthRaw)) : ""}</div>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[0.6rem]" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-emerald-400" />Net Worth</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-b-2 border-dashed border-amber-400" />Retire</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-b-2 border-dashed" style={{ borderColor: 'var(--text-secondary)' }} />Life Exp.</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-amber-400" style={{ background: 'var(--goal-marker-fill)' }} />Goals</span>
              </div>
            </div>

            <div className="relative h-72 sm:h-80 lg:h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.data} margin={{ top: 40, right: 15, bottom: 0, left: 5 }}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="70%" stopColor="#22c55e" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="age" type="number" domain={[currentAge, lifeExpectancy]}
                    tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8}
                    tick={{ fontSize: 10, fill: "var(--chart-tick)" }}
                    label={{ value: "Age", position: "insideBottomRight", offset: -4, fill: "var(--chart-tick)", fontSize: 10 }} />
                  {/* Fix 6: Animated Y-axis via controlled domain */}
                  <YAxis tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} tickMargin={8}
                    tickFormatter={fmtAxis} tick={{ fontSize: 10, fill: "var(--chart-tick)" }} width={65}
                    domain={[0, Math.round(yMax)]} allowDataOverflow={false} />
                  <Tooltip content={<NetWorthTooltip />} cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }} />

                  {/* Retirement line */}
                  {earliestRetireAge <= lifeExpectancy && (
                    <ReferenceLine x={earliestRetireAge} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.6}
                      label={{ value: `Retire ${earliestRetireAge}`, position: "insideTopLeft", fontSize: 9, fill: "#f59e0b", offset: 6 }} />
                  )}

                  {/* Fix 7: Life expectancy line */}
                  <ReferenceLine x={lifeExpectancy} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.5}
                    label={{ value: `Life ${lifeExpectancy}`, position: "insideTopRight", fontSize: 9, fill: "#9ca3af", offset: 6 }} />

                  {/* Deficit line */}
                  {firstDeficitAge && (
                    <ReferenceLine x={firstDeficitAge} stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5}
                      label={{ value: "⚠ Deficit", position: "insideTopRight", fontSize: 8, fill: "#ef4444" }} />
                  )}

                  <Area type="monotone" dataKey="netWorth" stroke="#22c55e" strokeWidth={2.5} fill="url(#nwGrad)"
                    dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#22c55e" }}
                    isAnimationActive={true} animationDuration={600} animationEasing="ease-out" />

                  <Customized component={(props) => <GoalOverlayCustomized {...props} goals={goalPoints} projection={simulation.data} />} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {(constrainedYears > 0 || shortfallYears > 0 || simulation.depletionAge) && (
              <div className="mt-4 rounded-xl border px-4 py-2.5 flex items-start gap-2"
                style={{ background: 'var(--info-red-bg)', borderColor: 'var(--info-red-border)' }}>
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <div className="text-[0.63rem] space-y-1" style={{ color: 'var(--info-red-text)' }}>
                  {constrainedYears > 0 && (
                    <div>
                      <strong>Cash Flow Warning:</strong> {constrainedYears} year{constrainedYears > 1 ? "s" : ""} with negative cash flow.{" "}
                      {firstDeficitAge && <>Starts at age <strong>{firstDeficitAge}</strong> — shortfall drawn from your portfolio.</>}
                    </div>
                  )}
                  {shortfallYears > 0 && (
                    <div>
                      Planned contributions could not be fully funded in{" "}
                      <strong>{shortfallYears}</strong> year{shortfallYears > 1 ? "s" : ""}.
                    </div>
                  )}
                  {simulation.depletionAge && (
                    <div>
                      Portfolio depleted at age <strong>{simulation.depletionAge}</strong>, with{" "}
                      <strong>{fmt(lastPoint?.cumUnfunded ?? 0)}</strong> of goals and expenses unfunded.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Peak Net Worth", value: fmt(simulation.peakNW), sub: numToWordsIndian(simulation.peakNW), color: "var(--badge-emerald-text)", bg: "var(--badge-emerald-bg)", border: "var(--info-emerald-border)" },
              /* netWorthRaw, not the clamped netWorth: a depleted plan should
                 not display as a tidy ₹0. */
              { label: "Corpus at Retire", value: retirePoint ? fmt(retirePoint.netWorthRaw) : "—", sub: retirePoint ? `${fmt(retirePoint.liquidNW)} liquid · ${fmt(retirePoint.lockedNW)} locked` : "", color: "var(--badge-amber-text)", bg: "var(--badge-amber-bg)", border: "var(--info-amber-border)" },
              { label: "FI Age", value: simulation.fiAge || "—", sub: simulation.fiAge ? (simulation.fiAgeSustained === simulation.fiAge ? `${simulation.fiAge - age} yrs away` : simulation.fiAgeSustained ? `holds from ${simulation.fiAgeSustained}` : "not sustained") : "Not reached", color: "var(--badge-blue-text)", bg: "var(--badge-blue-bg)", border: "var(--info-blue-border)" },
              { label: `NW at ${lifeExpectancy}`, value: lastPoint ? fmt(lastPoint.netWorth) : "—", sub: lastPoint && lastPoint.netWorthRaw <= 0 ? "⚠ Depleted" : "", color: lastPoint && lastPoint.netWorthRaw <= 0 ? "var(--badge-red-text)" : "var(--badge-violet-text)", bg: lastPoint && lastPoint.netWorthRaw <= 0 ? "var(--badge-red-bg)" : "var(--badge-violet-bg)", border: lastPoint && lastPoint.netWorthRaw <= 0 ? "var(--info-red-border)" : "var(--info-violet-border)" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border p-3"
                style={{ background: c.bg, borderColor: c.border }}>
                <div className="text-[0.53rem] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>{c.label}</div>
                <div className="mt-1 text-base font-black sm:text-lg" style={{ color: c.color }}>{c.value}</div>
                <div className="mt-0.5 text-[0.53rem] italic truncate" style={{ color: 'var(--text-secondary)' }}>{c.sub}</div>
              </div>
            ))}
          </div>

        </section>
      </main>
    </div>
  );
}
