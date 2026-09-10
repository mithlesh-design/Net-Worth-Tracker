"use client";

import IncomeSources from "@/components/sections/IncomeSources";
import BudgetExpenses from "@/components/sections/BudgetExpenses";
import MiniChart from "@/components/wizard/MiniChart";

export default function StepIncomeExpenses({
  plan, incomes, updateIncome, addIncome, removeIncome,
  findingsFor, totalMonthlyIncome, setField, premiums, homeGoalAge,
  simulation,
}) {
  return (
    <div className="space-y-4">
      <IncomeSources
        plan={plan} incomes={incomes} updateIncome={updateIncome}
        addIncome={addIncome} removeIncome={removeIncome}
        findingsFor={findingsFor} totalMonthlyIncome={totalMonthlyIncome}
        defaultOpen
      />
      <BudgetExpenses
        plan={plan} setField={setField} findingsFor={findingsFor}
        premiums={premiums} homeGoalAge={homeGoalAge}
        defaultOpen
      />
      <MiniChart
        simulation={simulation}
        currentAge={plan.currentAge}
        lifeExpectancy={plan.lifeExpectancy}
        retirementAge={plan.retirementAge}
      />
    </div>
  );
}
