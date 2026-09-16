"use client";

import InvestmentStrategy from "@/components/sections/InvestmentStrategy";
import TaxWall from "@/components/sections/TaxWall";
import MonthlyInvestments from "@/components/sections/MonthlyInvestments";
import CurrentHoldings from "@/components/sections/CurrentHoldings";
import PropertyInvestments from "@/components/sections/PropertyInvestments";
import MiniChart from "@/components/wizard/MiniChart";
import SuccessScore from "@/components/sections/SuccessScore";

/* The levers first, the data entry below them. The old Investments step opened
   on two long forms with no feedback at all, so the user filled in twenty
   fields before learning anything. Here the things that move the outcome are
   at the top and the forms that feed them are collapsed underneath, with the
   Success Score as the hero above everything. */
export default function StepStrategyHub({
  plan, setField, findingsFor, cplan, makeId, simulation, totalHoldings,
  monthlyInvestment, setMonthlyInvestment,
  expectedXIRR, setExpectedXIRR,
  investmentStepUp, setInvestmentStepUp,
  investSurplus, setInvestSurplus,
  postRetireReturn, setPostRetireReturn,
  ratesAreCustom, blendedNow, resetAllRates,
  earliestRetireAge, successScore, scoreStale, goalGap, lifeExpectancy,
  spouseHoldingsTotal,
}) {
  const spouseOn = !!plan.spouse?.enabled;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Strategy Hub
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          The assumptions driving your projection, and the portfolio behind them.
        </p>
      </div>

      <SuccessScore
        result={successScore}
        stale={scoreStale}
        hasGoals={!!goalGap?.hasGoals}
        lifeExpectancy={lifeExpectancy}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
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
          <TaxWall plan={plan} setField={setField} defaultOpen={false} />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <MiniChart
            simulation={simulation}
            currentAge={plan.currentAge}
            lifeExpectancy={plan.lifeExpectancy}
            retirementAge={plan.retirementAge}
          />
        </div>
      </div>

      <div className="pt-2 space-y-4">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h3
            className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--text-muted)" }}
          >
            Your investment data
          </h3>
          <span className="text-[0.6rem] text-right" style={{ color: "var(--text-subtle)" }}>
            Expand to edit what you hold and what you add each month
          </span>
        </div>
        <MonthlyInvestments
          plan={plan} setField={setField} findingsFor={findingsFor}
          cplan={cplan} makeId={makeId}
        />
        <CurrentHoldings
          plan={plan} setField={setField} findingsFor={findingsFor}
          totalHoldings={totalHoldings} startingPortfolio={simulation.openingPortfolio}
        />
        <PropertyInvestments
          plan={plan} setField={setField} findingsFor={findingsFor}
          makeId={makeId} simulation={simulation}
        />
        {/* Only once a spouse exists. An empty card for a person the user has
            not told us about is an advertisement, not a form. */}
        {spouseOn && (
          <CurrentHoldings
            plan={plan} setField={setField} findingsFor={findingsFor}
            totalHoldings={spouseHoldingsTotal}
            basePath="spouse.holdings"
            title={plan.spouse?.name ? `${plan.spouse.name}'s Holdings` : "Their Holdings"}
            /* No life insurance block or starting-portfolio framing for a
               spouse: both belong to the primary's own cards. */
            startingPortfolio={null}
            showStartingPortfolioNote={false}
          />
        )}
      </div>
    </div>
  );
}
