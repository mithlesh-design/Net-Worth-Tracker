const yesNo = (value) => value ? "Yes" : "No";
const num = (value) => Number(value) || 0;
const rows = (plan, mapper) => [plan, ...(plan.members ?? [])].flatMap((person, household_index) =>
  (person.incomes ?? []).map((item) => mapper(item, household_index)));

export function toNetWorthPayload(plan, user) {
  const household = (plan.members ?? []).map((member) => ({
    member_type: member.relationship,
    member_name: member.personal?.fullName || "",
  }));
  const income = rows(plan, (item, household_index) => ({
    household_index, inc_type: item.role || "other", inc_frequency: item.frequency || "monthly",
    amount: num(item.amount), annual_growth: num(item.growthRate),
  }));
  const investment_strategy = [plan, ...(plan.members ?? [])].map((person, household_index) => ({
    household_index,
    monthly_sip: num(person.contributions?.mfSip?.amount),
    annual_step_up: num(person.contributions?.mfSip?.stepUp ?? plan.investmentStepUp),
    retirement_return: { pre: num(person.expectedXIRR ?? plan.expectedXIRR), post: num(person.postRetireReturn ?? plan.postRetireReturn) },
    invest_surplus: yesNo(person.investSurplus ?? plan.investSurplus),
    tax_wall: "old_regime",
  }));
  const contributionRows = [plan, ...(plan.members ?? [])].flatMap((person) =>
    ["nps", "ppf", "epf", "rd", "mfSip"].map((key) => {
      const item = person.contributions?.[key] ?? {};
      return { investment_type: key === "mfSip" ? "Mutual Fund SIP" : key.toUpperCase(), amount: num(item.amount),
        frequency: item.frequency || "monthly", current_value: num(person.holdings?.[key === "mfSip" ? "mf" : key]),
        expected_annual_return: num(item.annualReturn ?? plan.expectedXIRR), annual_contribution_increase: num(item.stepUp),
        my_pay_deduct: yesNo(item.fundedFromPayroll), account_open_date: null,
        employer_contribution: key === "epf" ? num(person.contributions?.epfEmployer?.amount) : 0 };
    }));
  const totalHoldings = { ...plan.holdings };
  for (const member of plan.members ?? []) for (const [key, value] of Object.entries(member.holdings ?? {})) totalHoldings[key] = num(totalHoldings[key]) + num(value);
  return {
    user_id: user.id,
    full_name: plan.personal?.fullName || user.name || user.email,
    user: { full_name: plan.personal?.fullName || user.name || "", email: user.email || "", dob: plan.personal?.dob || null,
      age: num(plan.currentAge), life_expectancy: num(plan.lifeExpectancy), retirement_age: num(plan.retirementAge),
      login_type: user.login_type || "google" },
    household, income,
    budget_expense: { household_expenses: num(plan.expenses?.household), rent: num(plan.expenses?.rent), own_house: yesNo((plan.properties ?? []).length > 0),
      medical_insurance_premium: num(plan.medical?.self?.premium) + num(plan.medical?.parents?.premium),
      inflation: { general_inflation: num(plan.inflationRate), lifestyle_inflation: num(plan.lifestyleCreep), other: num(plan.postRetireInflation) }, covers_cost: [] },
    insurance: (plan.lifePolicies ?? []).map((policy) => ({ insurance_type: "life", own_insurance: "Yes", parent_insurance: "No",
      policy_type: policy.type, total_sum_assured: num(policy.sumAssured), premium: num(policy.premium), premium_frequency: policy.premiumFrequency,
      premium_age: num(policy.premiumUntilAge), return_type: policy.returnOfPremium ? "return_of_premium" : "no_return" })),
    goals: (plan.goals ?? []).map((goal) => ({ goal_name: goal.name, target_age: num(goal.age), today_cost: num(goal.amount),
      expected_inflation: num(goal.inflationRate ?? plan.inflationRate), loan_finance: yesNo(goal.hasLoan), down_payment: num(goal.amount) * num(goal.downPaymentPct) / 100,
      loan_interest_rate: num(goal.loanRate), loan_tenure: num(goal.loanTenure) })),
    investment_strategy, monthly_investments: contributionRows,
    current_holdings: [{ current_value: { equity_mutual_funds: num(totalHoldings.mf), fd: num(totalHoldings.fd) + num(totalHoldings.rd), epf: num(totalHoldings.epf),
      stocks: num(totalHoldings.stocks) + num(totalHoldings.usStocks) + num(totalHoldings.rsu), gold: num(totalHoldings.gold), nps: num(totalHoldings.nps),
      ppf: num(totalHoldings.ppf), debt_mutual_funds: num(totalHoldings.debtMf), cash: num(totalHoldings.cash), other: num(totalHoldings.unallocated) } }],
    property: (plan.properties ?? []).map((property) => ({ market_value: num(property.value), rental_income: num(property.rentalIncome),
      annual_maintenance: num(property.value) * num(property.maintenancePct) / 100, loan_outstanding: num(property.loanOutstanding) })),
  };
}
