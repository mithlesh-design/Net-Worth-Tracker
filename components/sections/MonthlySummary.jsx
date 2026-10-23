"use client";

import { LayoutDashboard } from "lucide-react";
import { SectionCard, InfoStrip, StatGrid, StatTile } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

/* `household` names who is included ("You, Priya"), or is null when you are
   planning alone. */
export default function MonthlySummary({
  plan, premiums, totalHoldings, simulation, totalMonthlyIncome, household = null,
}) {
  const living = plan.expenses.household + plan.expenses.rent;

  const today = simulation.data[0];
  /* Medical premiums from the prop; life premiums from the engine, which
     knows every included person's policies and which are still being paid. */
  const medicalMonthly = premiums.total / 12;
  const lifeMonthly = today ? today.lifePremium / 12 : 0;
  const premiumMonthly = medicalMonthly + lifeMonthly;
  const emiMonthly = today ? today.totalEMI / 12 : 0;

  /* From the engine, for the same reason as income below: it is everyone
     included, each on their own detailed-or-SIP basis, and stops for anyone
     already retired. A figure built from your own contribution plan would
     leave every member out. */
  const contributionsMonthly = today ? today.plannedContribution / 12 : 0;
  const payrollMonthly = today ? today.payrollContribution / 12 : 0;
  const cashMonthly = today ? today.targetInvestment / 12 : 0;

  /* Income comes from the engine, not from the totalMonthlyIncome prop, which
     is yours alone. Two reasons: it follows who is included in the household,
     so these tiles can never disagree with the chart beside them; and it
     stops each person's income at their retirement age, which the prop's flat
     reduce over plan.incomes does not. Same pattern as emiMonthly above. */
  const incomeMonthly = (today ? today.income / 12 : totalMonthlyIncome)
                      + (today ? today.policyIncome / 12 : 0);

  const surplus = incomeMonthly - living - premiumMonthly
                - emiMonthly - contributionsMonthly;

  const liquid = simulation.data[0]?.liquidNW ?? 0;
  const locked = simulation.data[0]?.lockedNW ?? 0;
  const illiquid = simulation.data[0]?.illiquidNW ?? 0;
  const startingPortfolio = simulation.openingPortfolio ?? totalHoldings;

  return (
    <SectionCard title="Monthly Summary" icon={LayoutDashboard}>
      <StatGrid>
        <StatTile label="Monthly Income" value={fmt(incomeMonthly)}
          sub={`${fmt(incomeMonthly * 12)}/yr${household ? ` · ${household}` : ""}`} tone="good" />
        <StatTile label="Living Expenses" value={fmt(living)}
          sub={`household ${fmt(plan.expenses.household)} · rent ${fmt(plan.expenses.rent)}`} />
        <StatTile label="Insurance Premium" value={fmt(premiumMonthly)}
          sub={lifeMonthly > 0
            ? `medical ${fmt(medicalMonthly)} · life ${fmt(lifeMonthly)}`
            : "monthly equivalent"} />
        <StatTile label="Planned Contributions" value={fmt(contributionsMonthly)}
          sub={payrollMonthly > 0
            ? `${fmt(payrollMonthly)} payroll · ${fmt(cashMonthly)} cash`
            : "from take-home cash"} />
        <StatTile
          label={surplus < 0 ? "Monthly Shortfall" : "Remaining Surplus"}
          value={fmt(Math.abs(surplus))}
          sub={surplus < 0 ? "planned outgoings exceed income" : "after all outgoings"}
          tone={surplus < 0 ? "warn" : "good"} />
        <StatTile label="Starting Portfolio" value={fmt(startingPortfolio)}
          sub={illiquid > 0
            ? `${fmt(liquid)} liquid · ${fmt(locked)} locked · ${fmt(illiquid)} property`
            : `${fmt(liquid)} liquid · ${fmt(locked)} locked`} />
      </StatGrid>

      {surplus < 0 && (
        <div className="mt-6">
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
