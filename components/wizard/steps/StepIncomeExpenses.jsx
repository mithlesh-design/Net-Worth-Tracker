"use client";

import IncomeSources from "@/components/sections/IncomeSources";
import HouseholdMembers from "@/components/sections/HouseholdMembers";
import BudgetExpenses from "@/components/sections/BudgetExpenses";
import MedicalInsurance from "@/components/sections/MedicalInsurance";
import LifeInsurance from "@/components/sections/LifeInsurance";

export default function StepIncomeExpenses({
  plan, incomes, updateIncome, addIncome, removeIncome,
  findingsFor, totalMonthlyIncome, setField, premiums, homeGoalAge,
  scopeFor, addMember, removeMember, makeId,
}) {
  const hasMedical = plan.medical?.self?.enabled || plan.medical?.parents?.enabled;
  const hasLife = (plan.lifeInsurance?.value ?? 0) > 0;

  return (
    <div className="space-y-4">
      <IncomeSources
        plan={plan} incomes={incomes} updateIncome={updateIncome}
        addIncome={addIncome} removeIncome={removeIncome}
        findingsFor={findingsFor} totalMonthlyIncome={totalMonthlyIncome}
        title="Your Income"
        defaultOpen
      />
      {/* Between your income and the shared expense figure: where someone
          reading top-down expects other earners, and immediately before the
          costs the household shares. The only place members are created. */}
      <HouseholdMembers
        plan={plan} scopeFor={scopeFor}
        addMember={addMember} removeMember={removeMember} makeId={makeId}
      />
      <BudgetExpenses
        plan={plan} setField={setField} findingsFor={findingsFor}
        premiums={premiums} homeGoalAge={homeGoalAge} scopeFor={scopeFor}
        defaultOpen
      />

      {/* Protection, folded in from the step it used to occupy. Both cards
          already default to collapsed, so they arrive out of the way — but
          never hidden, because the premium is a real line in the cash-flow
          waterfall. The sub-heading stops the step reading as four
          undifferentiated cards. */}
      <div className="pt-2 space-y-4">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h3
            className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--text-muted)" }}
          >
            Protection
          </h3>
          <span className="text-[0.6rem] text-right" style={{ color: "var(--text-subtle)" }}>
            {hasMedical || hasLife
              ? "Premiums are charged against your cash flow"
              : "Optional — leave empty if you have none"}
          </span>
        </div>
        <MedicalInsurance plan={plan} setField={setField} findingsFor={findingsFor} />
        <LifeInsurance plan={plan} setField={setField} findingsFor={findingsFor} />
      </div>
    </div>
  );
}
