"use client";

import { SectionCard, InfoStrip } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

/* The derived cash-flow figures the brief asks for, in the existing tile
   styling so it reads as part of the current dashboard. Everything here is
   computed from the underlying entries: nothing is stored, so nothing can
   drift out of sync. */
function Tile({ label, value, sub, tone = "default" }) {
  const palette = {
    default: { color: 'var(--text-primary)', bg: 'var(--bg-tertiary)', border: 'var(--border-secondary)' },
    good: { color: 'var(--badge-emerald-text)', bg: 'var(--badge-emerald-bg)', border: 'var(--info-emerald-border)' },
    warn: { color: 'var(--info-red-text)', bg: 'var(--info-red-bg)', border: 'var(--info-red-border)' },
    muted: { color: 'var(--text-secondary)', bg: 'var(--bg-tertiary)', border: 'var(--border-secondary)' },
  }[tone];
  return (
    <div className="rounded-xl border px-3 py-2.5"
      style={{ background: palette.bg, borderColor: palette.border }}>
      <div className="text-[0.5rem] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-black" style={{ color: palette.color }}>{value}</div>
      {sub && <div className="mt-0.5 text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

export default function MonthlySummary({
  plan, cplan, premiums, totalHoldings, simulation, totalMonthlyIncome,
}) {
  const living = plan.expenses.household + plan.expenses.rent;
  const premiumMonthly = premiums.total / 12;
  const contributionsMonthly = cplan.detailedMonthly > 0
    ? cplan.detailedMonthly
    : plan.legacy.monthlyInvestment;

  /* Year 0, so every figure here describes today. Reading year 1 would show
     today's income against next year's grown tax. */
  const today = simulation.data[0];
  const emiMonthly = today ? today.totalEMI / 12 : 0;
  const taxMonthly = today ? today.incomeTax / 12 : 0;

  /* Contributions are a transfer from cash into assets, not an expense and not
     extra wealth. The surplus is what is left after they have been made. */
  const surplus = totalMonthlyIncome - taxMonthly - living - premiumMonthly
                - emiMonthly - contributionsMonthly;

  const liquid = simulation.data[0]?.liquidNW ?? 0;
  const locked = simulation.data[0]?.lockedNW ?? 0;

  return (
    <SectionCard title="Monthly Summary">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Monthly Income" value={fmt(totalMonthlyIncome)}
          sub={`${fmt(totalMonthlyIncome * 12)}/yr`} tone="good" />
        <Tile label="Living Expenses" value={fmt(living)}
          sub={`household ${fmt(plan.expenses.household)} · rent ${fmt(plan.expenses.rent)}`} />
        <Tile label="Insurance Premium" value={fmt(premiumMonthly)}
          sub="monthly equivalent" />
        <Tile label="Planned Contributions" value={fmt(contributionsMonthly)}
          sub={cplan.useDetailed
            ? `${fmt(cplan.payrollMonthly)} payroll · ${fmt(cplan.cashMonthly)} cash`
            : "aggregate SIP target"} />
        <Tile
          label={surplus < 0 ? "Monthly Shortfall" : "Remaining Surplus"}
          value={fmt(Math.abs(surplus))}
          sub={surplus < 0 ? "planned outgoings exceed income" : "after all outgoings"}
          tone={surplus < 0 ? "warn" : "good"} />
        <Tile label="Current Holdings" value={fmt(totalHoldings)}
          sub={`${fmt(liquid)} liquid · ${fmt(locked)} locked`} />
      </div>

      {surplus < 0 && (
        <div className="mt-3">
          <InfoStrip tone="red">
            Your planned contributions and expenses exceed your income by{" "}
            <strong>{fmt(Math.abs(surplus))}/month</strong>. The projection funds only
            what your cash allows and reports the rest as a shortfall.
          </InfoStrip>
        </div>
      )}
    </SectionCard>
  );
}
