"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import AuthButton from "@/components/AuthButton";
import { useTheme } from "@/components/ThemeProvider";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  IndianRupee,
  Landmark,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  X,
  Plus,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
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
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const CURRENT_YEAR = new Date().getFullYear();

const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return sign + "₹" + (abs / 1e7).toFixed(2) + " Cr";
  if (abs >= 1e5) return sign + "₹" + (abs / 1e5).toFixed(2) + " L";
  return sign + "₹" + abs.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const fmtAxis = (v) => {
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
function numToWordsIndian(n) {
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
const toWords = (v) => (!v || isNaN(v) || v === 0) ? "" : "₹ " + numToWordsIndian(v);

/* Frequency helper */
const toAnnual = (amount, frequency) => {
  if (frequency === "monthly") return amount * 12;
  if (frequency === "quarterly") return amount * 4;
  return amount; // yearly
};

/* ─── New Tax Regime 2024-25 (India) ─── */
function calcIncomeTax(annualIncome) {
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

/* EMI Calculator */
function calcEMI(principal, annualRate, tenureYears) {
  if (principal <= 0 || tenureYears <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/* Loan yearly balance */
function loanScheduleYearly(principal, annualRate, tenureYears) {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  const emi = calcEMI(principal, annualRate, tenureYears);
  let balance = principal;
  const yearly = [];
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    balance = Math.max(0, balance - (emi - interest));
    if (m % 12 === 0 || m === n) yearly.push(Math.round(balance));
  }
  return yearly;
}

const GOAL_EMOJIS = { home: "🏠", education: "🎓", car: "🚗", wedding: "💒", travel: "✈️", retirement: "🏖️", other: "🎯" };

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI
   ═══════════════════════════════════════════════════════════════════════════ */

function SliderInput({ label, value, onChange, min = 0, max = 100, step = 1, prefix = "", suffix = "", showWords = false, warn = false }) {
  const pct = ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100;
  const trackColor = warn ? "#ef4444" : "#22c55e";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[0.63rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <div className={`flex items-center rounded-lg px-2 py-1 border text-xs font-bold ${warn ? "" : ""}`}
          style={warn
            ? { background: 'var(--info-red-bg)', borderColor: 'var(--info-red-border)', color: 'var(--info-red-text)' }
            : { background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }
          }>
          {prefix && <span className="mr-0.5 text-[0.6rem]" style={{ color: 'var(--text-secondary)' }}>{prefix}</span>}
          <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-20 text-right bg-transparent outline-none" step={step} style={{ color: 'var(--text-primary)' }} />
          {suffix && <span className="ml-0.5 text-[0.6rem]" style={{ color: 'var(--text-secondary)' }}>{suffix}</span>}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${trackColor} ${pct}%, var(--slider-track-bg) ${pct}%)` }} />
      {showWords && value > 0 && <p className="text-[0.55rem] italic truncate" style={{ color: 'var(--text-secondary)' }}>{toWords(value)}</p>}
    </div>
  );
}

function SectionCard({ children, title, className = "" }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${className}`}
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', boxShadow: '0 1px 2px var(--shadow-color)' }}>
      {title && <div className="text-[0.58rem] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--text-secondary)' }}>{title}</div>}
      {children}
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = true, badge = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SectionCard>
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
        <div className="text-[0.58rem] font-bold uppercase tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          {title}
          {badge && <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold normal-case tracking-normal" style={{ background: 'var(--badge-emerald-bg)', color: 'var(--badge-emerald-text)' }}>{badge}</span>}
        </div>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: 'var(--text-muted)' }} />
      </button>
      {open && <div className="mt-3 space-y-4">{children}</div>}
    </SectionCard>
  );
}

/* Toggle Switch */
function ToggleSwitch({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${value ? "bg-emerald-500" : ""}`}
        style={!value ? { background: 'var(--toggle-off-bg)' } : {}}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0.5"}`}
          style={{ background: 'var(--bg-secondary)' }} />
      </button>
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}

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
        {d.totalEMI > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Loan EMIs</span><span className="text-rose-400 font-semibold">−{fmt(d.totalEMI)}</span></div>}
        {d.maintenanceCost > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Maintenance</span><span className="text-amber-500 font-semibold">−{fmt(d.maintenanceCost)}</span></div>}
        <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-secondary)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Available Cash</span>
          <span className={`font-bold ${d.availableCash < 0 ? "text-red-500" : "text-emerald-500"}`}>{fmt(d.availableCash)}</span>
        </div>
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Invested</span><span className="text-sky-500 font-semibold">+{fmt(d.invested)}</span></div>
        {d.surplusSpent > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Surplus Spent</span><span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{fmt(d.surplusSpent)}</span></div>}
        {d.goalCostGross > 0 && <div className="flex justify-between border-t pt-1" style={{ borderColor: 'var(--border-secondary)' }}><span style={{ color: 'var(--text-secondary)' }}>Goals (incl. tax)</span><span className="text-amber-500 font-semibold">−{fmt(d.goalCostGross)}</span></div>}
        {d.totalPropertyValue > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Property Assets</span><span className="text-amber-500 font-semibold">{fmt(d.totalPropertyValue)}</span></div>}
        {d.totalLoanOutstanding > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Loans</span><span className="text-rose-400 font-semibold">−{fmt(d.totalLoanOutstanding)}</span></div>}
        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Return Rate</span><span style={{ color: 'var(--text-secondary)' }}>{d.returnRate}%</span></div>
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

  /* ── Timeline ── */
  const [currentAge, setCurrentAge] = useState(28);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);

  /* ── Income Sources (Fix 2: frequency field) ── */
  const [incomes, setIncomes] = useState([
    { id: 1, name: "Primary Salary", amount: 150000, frequency: "monthly", growthRate: 10, retireAge: 55 },
  ]);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newInc, setNewInc] = useState({ name: "Bonus", amount: 300000, frequency: "yearly", growthRate: 5, retireAge: 55 });

  /* ── Expenses ── */
  const [monthlyExpense, setMonthlyExpense] = useState(50000);
  const [inflationRate, setInflationRate] = useState(6);
  const [lifestyleCreep, setLifestyleCreep] = useState(2);

  /* ── Investments ── */
  const [currentNW, setCurrentNW] = useState(500000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(50000);
  const [investmentStepUp, setInvestmentStepUp] = useState(10);
  const [expectedXIRR, setExpectedXIRR] = useState(12);

  /* ── Fix 1: Surplus strategy toggle ── */
  const [investSurplus, setInvestSurplus] = useState(true);

  /* ── Module 2: Post-Retirement Return ── */
  const [postRetireReturn, setPostRetireReturn] = useState(7);

  /* ── Module 4: LTCG Tax Wall ── */
  const [exitTaxRate, setExitTaxRate] = useState(12.5);

  /* ── Fix 8: Goals with optional loan financing ── */
  const [goals, setGoals] = useState([
    {
      id: 1, name: "Buy Home", emoji: "home", age: 32, amount: 8000000,
      hasLoan: true, downPaymentPct: 20, loanRate: 8.5, loanTenure: 20,
      // Home-specific
      appreciationRate: 5, maintenancePct: 1,
    },
    {
      id: 2, name: "Kid's Education", emoji: "education", age: 45, amount: 3000000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0,
    },
  ]);
  const [showAddGoal, setShowAddGoal] = useState(false);

  /* ── Income CRUD ── */
  const addIncome = () => {
    setIncomes([...incomes, { ...newInc, id: Date.now() }]);
    setShowAddIncome(false);
    setNewInc({ name: "Bonus", amount: 300000, frequency: "yearly", growthRate: 5, retireAge: 55 });
  };
  const removeIncome = (id) => setIncomes(incomes.filter((i) => i.id !== id));
  const updateIncome = (id, key, val) => setIncomes(incomes.map((i) => (i.id === id ? { ...i, [key]: val } : i)));

  /* ── Goal CRUD ── */
  const addGoal = () => {
    setGoals([...goals, {
      id: Date.now(), name: "New Goal", emoji: "other", age: currentAge + 5, amount: 1000000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0,
    }]);
    setShowAddGoal(false);
  };
  const removeGoal = (id) => setGoals(goals.filter((g) => g.id !== id));
  const updateGoal = (id, key, val) => setGoals(goals.map((g) => (g.id === id ? { ...g, [key]: val } : g)));

  /* ── Derived ── */
  const totalMonthlyIncome = incomes.reduce((s, i) => s + toAnnual(i.amount, i.frequency) / 12, 0);
  const earliestRetireAge = incomes.length > 0 ? Math.min(...incomes.map((i) => i.retireAge)) : 60;

  /* ══════════════════════════════════════════════════════════════════════
     PROFILE SAVE / LOAD (requires auth)
     ══════════════════════════════════════════════════════════════════════ */

  const { data: session } = useSession();
  const [savedProfiles, setSavedProfiles] = useState([]);

  // Gather all current settings into a serializable object
  const gatherSettings = useCallback(() => ({
    currentAge, lifeExpectancy,
    incomes, monthlyExpense, inflationRate, lifestyleCreep,
    currentNW, monthlyInvestment, investmentStepUp, expectedXIRR,
    investSurplus, postRetireReturn, exitTaxRate, goals,
  }), [currentAge, lifeExpectancy, incomes, monthlyExpense, inflationRate, lifestyleCreep, currentNW, monthlyInvestment, investmentStepUp, expectedXIRR, investSurplus, postRetireReturn, exitTaxRate, goals]);

  // Apply loaded settings
  const applySettings = useCallback((s) => {
    if (s.currentAge !== undefined) setCurrentAge(s.currentAge);
    if (s.lifeExpectancy !== undefined) setLifeExpectancy(s.lifeExpectancy);
    if (s.incomes) setIncomes(s.incomes);
    if (s.monthlyExpense !== undefined) setMonthlyExpense(s.monthlyExpense);
    if (s.inflationRate !== undefined) setInflationRate(s.inflationRate);
    if (s.lifestyleCreep !== undefined) setLifestyleCreep(s.lifestyleCreep);
    if (s.currentNW !== undefined) setCurrentNW(s.currentNW);
    if (s.monthlyInvestment !== undefined) setMonthlyInvestment(s.monthlyInvestment);
    if (s.investmentStepUp !== undefined) setInvestmentStepUp(s.investmentStepUp);
    if (s.expectedXIRR !== undefined) setExpectedXIRR(s.expectedXIRR);
    if (s.investSurplus !== undefined) setInvestSurplus(s.investSurplus);
    if (s.postRetireReturn !== undefined) setPostRetireReturn(s.postRetireReturn);
    if (s.exitTaxRate !== undefined) setExitTaxRate(s.exitTaxRate);
    if (s.goals) setGoals(s.goals);
  }, []);

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

  const simulation = useMemo(() => {
    const years = lifeExpectancy - currentAge;
    if (years <= 0) return { data: [], fiAge: null, peakNW: 0 };

    const data = [];
    let nw = currentNW;
    let annualExpense = monthlyExpense * 12;
    let targetAnnualInvestment = monthlyInvestment * 12;
    let fiAge = null;
    let peakNW = currentNW;

    // Pre-compute goal loan structures
    // Each goal with a loan spawns an EMI stream starting at goal.age
    const goalLoanState = goals.map((g) => {
      if (!g.hasLoan) return null;
      const dp = g.amount * (g.downPaymentPct / 100);
      const loanAmt = g.amount - dp;
      if (loanAmt <= 0) return null;
      const emi = calcEMI(loanAmt, g.loanRate, g.loanTenure);
      const balances = loanScheduleYearly(loanAmt, g.loanRate, g.loanTenure);
      return {
        goalId: g.id, goalAge: g.age, emoji: g.emoji,
        downPayment: dp, loanAmount: loanAmt,
        annualEMI: emi * 12, tenure: g.loanTenure, balances,
        appreciationRate: g.appreciationRate || 0,
        maintenancePct: g.maintenancePct || 0,
        assetValue: g.amount, // initial asset value for appreciating goals
      };
    }).filter(Boolean);

    for (let y = 0; y <= years; y++) {
      const age = currentAge + y;
      const calendarYear = CURRENT_YEAR + y;

      // ── Gross income ──
      let grossIncome = 0;
      incomes.forEach((inc) => {
        if (age < inc.retireAge) {
          grossIncome += toAnnual(inc.amount, inc.frequency) * Math.pow(1 + inc.growthRate / 100, y);
        }
      });
      const isRetired = incomes.every((inc) => age >= inc.retireAge);

      // ── Fix 4: Income tax (new regime) ──
      const incomeTax = isRetired ? 0 : calcIncomeTax(grossIncome);
      const postTaxIncome = grossIncome - incomeTax;

      // ── Module 2: Return rate ──
      const returnRate = isRetired ? postRetireReturn : expectedXIRR;

      // ── Grow expenses ──
      if (y > 0) annualExpense *= 1 + (inflationRate + lifestyleCreep) / 100;

      // ── Grow target investment ──
      if (y > 0) targetAnnualInvestment *= 1 + investmentStepUp / 100;

      // ── Process goal events & loans ──
      let totalEMI = 0;
      let maintenanceCost = 0;
      let totalPropertyValue = 0;
      let totalLoanOutstanding = 0;
      let goalCostNet = 0;
      let goalCostGross = 0;

      // Process each goal
      goals.forEach((g) => {
        // Goal trigger: deduct down payment (or full amount if no loan)
        if (g.age === age) {
          if (g.hasLoan) {
            // Deduct down payment, grossed up for tax
            const dp = g.amount * (g.downPaymentPct / 100);
            const grossDP = dp / (1 - exitTaxRate / 100);
            goalCostNet += dp;
            goalCostGross += grossDP;
          } else {
            // Full amount, grossed up for tax
            const gross = g.amount / (1 - exitTaxRate / 100);
            goalCostNet += g.amount;
            goalCostGross += gross;
          }
        }
      });

      // Active loan EMIs and property tracking
      goalLoanState.forEach((ls) => {
        const yearsElapsed = age - ls.goalAge;
        if (yearsElapsed < 0) return; // not yet purchased
        if (yearsElapsed < ls.tenure) {
          totalEMI += ls.annualEMI;
          totalLoanOutstanding += (ls.balances[yearsElapsed] || 0);
        }
        // Asset appreciation (for home-type goals)
        if (ls.appreciationRate > 0 && yearsElapsed >= 0) {
          const currentAssetVal = ls.assetValue * Math.pow(1 + ls.appreciationRate / 100, yearsElapsed);
          totalPropertyValue += currentAssetVal;
          // Module 3: Maintenance
          if (ls.maintenancePct > 0) {
            maintenanceCost += currentAssetVal * (ls.maintenancePct / 100);
          }
        }
      });

      // ═══ MODULE 1: Cash Flow Waterfall ═══
      const totalAnnualSpends = annualExpense + totalEMI + maintenanceCost;
      const availableCash = postTaxIncome - totalAnnualSpends;

      let actualInvestment = 0;
      let surplusSpent = 0;

      if (!isRetired) {
        if (investSurplus) {
          // Fix 1: Invest ALL surplus
          actualInvestment = Math.max(0, availableCash);
        } else {
          // Cap at target SIP
          actualInvestment = Math.max(0, Math.min(targetAnnualInvestment, availableCash));
          surplusSpent = Math.max(0, availableCash - actualInvestment);
        }
      }

      const deficit = availableCash < 0 && !isRetired;
      const constrained = !isRetired && !investSurplus && availableCash >= 0 && availableCash < targetAnnualInvestment;

      // ── Net Worth Update ──
      if (y === 0) {
        nw = nw + actualInvestment;
      } else if (!isRetired) {
        nw = nw * (1 + returnRate / 100) + actualInvestment;
        if (deficit) nw += availableCash;
      } else {
        nw = nw * (1 + returnRate / 100) - totalAnnualSpends;
      }

      // Deduct goals
      nw -= goalCostGross;

      const liquidNW = nw;
      // Net worth = liquid investments only (property assets excluded)
      const totalNW = liquidNW;

      // Fix 5: chart value clamped to 0 (simulation continues internally)
      const chartNW = Math.max(0, totalNW);

      peakNW = Math.max(peakNW, totalNW);

      if (!fiAge && liquidNW > 0 && totalAnnualSpends > 0 && liquidNW >= totalAnnualSpends * 25) {
        fiAge = age;
      }

      data.push({
        age, year: calendarYear,
        netWorth: Math.round(chartNW),
        netWorthRaw: Math.round(totalNW),
        liquidNW: Math.round(liquidNW),
        totalPropertyValue: Math.round(totalPropertyValue),
        totalLoanOutstanding: Math.round(totalLoanOutstanding),
        grossIncome: Math.round(grossIncome),
        incomeTax: Math.round(incomeTax),
        postTaxIncome: Math.round(postTaxIncome),
        annualExpense: Math.round(annualExpense),
        totalEMI: Math.round(totalEMI),
        maintenanceCost: Math.round(maintenanceCost),
        availableCash: Math.round(availableCash),
        targetInvestment: Math.round(isRetired ? 0 : targetAnnualInvestment),
        invested: Math.round(actualInvestment),
        surplusSpent: Math.round(surplusSpent),
        goalCost: Math.round(goalCostNet),
        goalCostGross: Math.round(goalCostGross),
        deficit, constrained, isRetired, returnRate,
      });
    }

    return { data, fiAge, peakNW: Math.max(0, peakNW) };
  }, [currentAge, lifeExpectancy, incomes, monthlyExpense, inflationRate, lifestyleCreep, currentNW, monthlyInvestment, investmentStepUp, expectedXIRR, postRetireReturn, exitTaxRate, investSurplus, goals]);

  /* ── Derived ── */
  const retirePoint = simulation.data.find((d) => d.age === earliestRetireAge);
  const lastPoint = simulation.data[simulation.data.length - 1];
  const firstDeficitAge = simulation.data.find((d) => d.deficit)?.age;
  const constrainedYears = simulation.data.filter((d) => d.constrained || d.deficit).length;
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

          {/* Timeline */}
          <SectionCard title="Timeline">
            <div className="space-y-3">
              <SliderInput label="Current Age" value={currentAge} onChange={setCurrentAge} min={18} max={65} suffix=" yrs" />
              <SliderInput label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} min={60} max={100} suffix=" yrs" />
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
                <SliderInput label="Annual Growth" value={inc.growthRate} onChange={(v) => updateIncome(inc.id, "growthRate", v)} min={0} max={25} step={0.5} suffix="%" />
                <SliderInput label="Retire Age" value={inc.retireAge} onChange={(v) => updateIncome(inc.id, "retireAge", v)} min={currentAge} max={75} suffix=" yrs" />
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
            {/* Tax info */}
            <div className="rounded-lg border px-3 py-2 text-[0.6rem] space-y-1"
              style={{ background: 'var(--info-blue-bg)', borderColor: 'var(--info-blue-border)', color: 'var(--info-blue-text)' }}>
              <div className="font-bold">Income Tax (New Regime 2024-25)</div>
              <div>Gross: {fmt(totalMonthlyIncome * 12)} → Tax: {fmt(calcIncomeTax(totalMonthlyIncome * 12))} → Post-tax: {fmt(totalMonthlyIncome * 12 - calcIncomeTax(totalMonthlyIncome * 12))}/yr</div>
            </div>
          </CollapsibleSection>

          {/* Budget */}
          <CollapsibleSection title="Budget & Expenses">
            <SliderInput label="Monthly Spend" value={monthlyExpense} onChange={setMonthlyExpense} min={10000} max={500000} step={5000} prefix="₹" showWords />
            <SliderInput label="Inflation Rate" value={inflationRate} onChange={setInflationRate} min={0} max={15} step={0.5} suffix="%" />
            <SliderInput label="Lifestyle Creep" value={lifestyleCreep} onChange={setLifestyleCreep} min={0} max={10} step={0.5} suffix="%" />
            <div className="rounded-lg border px-3 py-2 text-[0.6rem]"
              style={{ background: 'var(--info-amber-bg)', borderColor: 'var(--info-amber-border)', color: 'var(--info-amber-text)' }}>
              Expenses grow at <strong>{(inflationRate + lifestyleCreep).toFixed(1)}%</strong>/yr
            </div>
          </CollapsibleSection>

          {/* Investment Strategy */}
          <CollapsibleSection title="Investment Strategy">
            <SliderInput label="Current Net Worth" value={currentNW} onChange={setCurrentNW} min={0} max={50000000} step={100000} prefix="₹" showWords />
            <SliderInput label="Monthly SIP (Target)" value={monthlyInvestment} onChange={setMonthlyInvestment} min={0} max={500000} step={5000} prefix="₹" showWords />
            <SliderInput label="Annual Step-Up" value={investmentStepUp} onChange={setInvestmentStepUp} min={0} max={30} suffix="%" />
            <SliderInput label="Expected XIRR (Working)" value={expectedXIRR} onChange={setExpectedXIRR} min={1} max={25} step={0.5} suffix="%" />
            <SliderInput label="Post-Retirement Return" value={postRetireReturn} onChange={setPostRetireReturn} min={1} max={15} step={0.5} suffix="%" />
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
                  {lastPoint && lastPoint.netWorthRaw > currentNW && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.63rem] font-bold"
                      style={{ background: 'var(--badge-emerald-bg)', color: 'var(--badge-emerald-text)' }}>
                      <ArrowUpRight size={11} /> +{fmt(lastPoint.netWorthRaw - currentNW)}
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

            {constrainedYears > 0 && (
              <div className="mt-4 rounded-xl border px-4 py-2.5 flex items-start gap-2"
                style={{ background: 'var(--info-red-bg)', borderColor: 'var(--info-red-border)' }}>
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <div className="text-[0.63rem]" style={{ color: 'var(--info-red-text)' }}>
                  <strong>Cash Flow Warning:</strong> {constrainedYears} year{constrainedYears > 1 ? "s" : ""} with negative cash flow.{" "}
                  {firstDeficitAge && <>Starts at age <strong>{firstDeficitAge}</strong> — shortfall drawn from net worth.</>}
                </div>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Peak Net Worth", value: fmt(simulation.peakNW), sub: numToWordsIndian(simulation.peakNW), color: "var(--badge-emerald-text)", bg: "var(--badge-emerald-bg)", border: "var(--info-emerald-border)" },
              { label: "Corpus at Retire", value: retirePoint ? fmt(retirePoint.netWorth) : "—", sub: retirePoint ? `Age ${earliestRetireAge}` : "", color: "var(--badge-amber-text)", bg: "var(--badge-amber-bg)", border: "var(--info-amber-border)" },
              { label: "FI Age", value: simulation.fiAge || "—", sub: simulation.fiAge ? `${simulation.fiAge - currentAge} yrs away` : "Not reached", color: "var(--badge-blue-text)", bg: "var(--badge-blue-bg)", border: "var(--info-blue-border)" },
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
