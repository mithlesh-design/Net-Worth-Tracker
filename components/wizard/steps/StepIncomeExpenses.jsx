"use client";

import IncomeSources from "@/components/sections/IncomeSources";
import HouseholdMembers from "@/components/sections/HouseholdMembers";
import BudgetExpenses from "@/components/sections/BudgetExpenses";
import MedicalInsurance from "@/components/sections/MedicalInsurance";
import LifeInsurance from "@/components/sections/LifeInsurance";
import { GroupHeading } from "@/components/ui";

export default function StepIncomeExpenses({
  plan, incomes, updateIncome, addIncome, removeIncome,
  findingsFor, totalMonthlyIncome, setField, premiums, homeGoalAge,
  scopeFor, addMember, removeMember, makeId,
}) {
  const hasMedical = plan.medical?.self?.enabled || plan.medical?.parents?.enabled;
  const hasLife = (plan.lifePolicies ?? []).length > 0;

  return (
    <div className="space-y-6">
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
      <div className="space-y-6 pt-2">
        <GroupHeading title="Protection"
          note={hasMedical || hasLife
            ? "Premiums are charged against your cash flow"
            : "Optional — leave empty if you have none"} />
        <MedicalInsurance plan={plan} setField={setField} findingsFor={findingsFor} />
        <LifeInsurance plan={plan} setField={setField} findingsFor={findingsFor} makeId={makeId} />
      </div>
    </div>
  );
}
