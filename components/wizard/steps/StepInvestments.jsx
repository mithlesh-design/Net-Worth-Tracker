"use client";

import MonthlyInvestments from "@/components/sections/MonthlyInvestments";
import CurrentHoldings from "@/components/sections/CurrentHoldings";
import InvestmentStrategy from "@/components/sections/InvestmentStrategy";
import TaxWall from "@/components/sections/TaxWall";

export default function StepInvestments({
  plan, setField, findingsFor, cplan, makeId, simulation, totalHoldings,
  monthlyInvestment, setMonthlyInvestment,
  expectedXIRR, setExpectedXIRR,
  investmentStepUp, setInvestmentStepUp,
  investSurplus, setInvestSurplus,
  postRetireReturn, setPostRetireReturn,
  ratesAreCustom, blendedNow, resetAllRates,
  earliestRetireAge,
}) {
  return (
    <div className="space-y-4">
      <MonthlyInvestments plan={plan} setField={setField} findingsFor={findingsFor}
        cplan={cplan} makeId={makeId} />
      <CurrentHoldings plan={plan} setField={setField} findingsFor={findingsFor}
        totalHoldings={totalHoldings} startingPortfolio={simulation.openingPortfolio} />
      <InvestmentStrategy
        plan={plan} setField={setField} cplan={cplan} simulation={simulation}
        totalHoldings={totalHoldings}
        monthlyInvestment={monthlyInvestment} setMonthlyInvestment={setMonthlyInvestment}
        expectedXIRR={expectedXIRR} setExpectedXIRR={setExpectedXIRR}
        investmentStepUp={investmentStepUp} setInvestmentStepUp={setInvestmentStepUp}
        investSurplus={investSurplus} setInvestSurplus={setInvestSurplus}
        postRetireReturn={postRetireReturn} setPostRetireReturn={setPostRetireReturn}
        ratesAreCustom={ratesAreCustom} blendedNow={blendedNow} resetAllRates={resetAllRates}
        earliestRetireAge={earliestRetireAge}
        defaultOpen
      />
      <TaxWall plan={plan} setField={setField} defaultOpen />
    </div>
  );
}
