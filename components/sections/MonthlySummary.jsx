"use client";

import { SectionCard, InfoStrip } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { spouseIsCombined } from "@/lib/finance/projection.mjs";

function Tile({ label, value, sub, tone = "default" }) {
  const color = {
    default: 'var(--value-primary)',
    good: 'var(--value-positive)',
    warn: 'var(--value-negative)',
    muted: 'var(--value-muted)',
  }[tone];
  return (
    <div className="py-2">
      <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
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

  const today = simulation.data[0];
  const emiMonthly = today ? today.totalEMI / 12 : 0;

  /* Income comes from the engine, not from the totalMonthlyIncome prop, which
     is primary-only and basis-blind. Two reasons: it follows combineSpouse
     automatically, so these tiles can never disagree with the chart beside
     them; and it honours each source's own retireAge, which the prop's flat
     reduce over plan.incomes does not. Same pattern as emiMonthly above. */
  const incomeMonthly = today ? today.income / 12 : totalMonthlyIncome;
  const combined = spouseIsCombined(plan);

  const surplus = incomeMonthly - living - premiumMonthly
                - emiMonthly - contributionsMonthly;

  const liquid = simulation.data[0]?.liquidNW ?? 0;
  const locked = simulation.data[0]?.lockedNW ?? 0;
  const illiquid = simulation.data[0]?.illiquidNW ?? 0;
  const startingPortfolio = simulation.openingPortfolio ?? totalHoldings;

  return (
    <SectionCard title="Monthly Summary">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Monthly Income" value={fmt(incomeMonthly)}
          sub={`${fmt(incomeMonthly * 12)}/yr${combined ? " · both of you" : ""}`} tone="good" />
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
        <Tile label="Starting Portfolio" value={fmt(startingPortfolio)}
          sub={illiquid > 0
            ? `${fmt(liquid)} liquid · ${fmt(locked)} locked · ${fmt(illiquid)} property`
            : `${fmt(liquid)} liquid · ${fmt(locked)} locked`} />
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
