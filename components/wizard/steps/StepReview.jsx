"use client";

import MonthlySummary from "@/components/sections/MonthlySummary";
import ProjectionChart from "@/components/sections/ProjectionChart";
import HouseholdInclusion from "@/components/sections/HouseholdInclusion";
import { SELF, includedPeople, personLabel, hasMembers } from "@/lib/household/members.mjs";
import { Button, InfoStrip } from "@/components/ui";
import { Save } from "lucide-react";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* The final read-only step. Goal editing moved to the Goal Workspace: asking
   someone to set goals and judge the result on the same screen meant they only
   found out whether the plan funded them at the point where there was nothing
   left to change.

   Everything here is the HOUSEHOLD: whoever is switched on under Include in
   Household Calculation, against the household's full costs. */
export default function StepReview({
  plan, age, lifeExpectancy,
  premiums, totalHoldings, simulation, totalMonthlyIncome,
  expectedXIRR, postRetireReturn, investmentStepUp, investSurplus, exitTaxRate,
  earliestRetireAge, goalPoints, policyPoints, setField, scopeFor,
  netWorthSave = { status: "idle", message: "" }, submitNetWorth, netWorthEnabled = false,
}) {
  /* "You, Priya" — named only once there is more than one person to name. */
  const household = hasMembers(plan)
    ? includedPeople(plan).map((p) => (p.id === SELF ? "You" : personLabel(plan, p.id))).join(", ")
    : null;

  if (netWorthEnabled && netWorthSave.status !== "saved") {
    return <div className="mx-auto max-w-xl space-y-4 rounded-2xl border p-6 text-center" style={{ background: "var(--card-bg)", borderColor: "var(--border-default)" }}>
      <h2 className="text-heading-sm" style={{ color: "var(--text-primary)" }}>
        {netWorthSave.status === "error" ? "We couldn’t load your saved plan" : "Saving your plan"}
      </h2>
      <p className="text-body" style={{ color: "var(--text-secondary)" }}>
        {netWorthSave.message || "Your plan is being saved and your account details are loading."}
      </p>
      {netWorthSave.status === "error" && <Button variant="cta" size="lg" className="gap-2" onClick={submitNetWorth}>
        <Save size={ICON_SIZE.md} /> Retry save and load
      </Button>}
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <div className="space-y-6 2xl:col-span-5">
          <MonthlySummary plan={plan} premiums={premiums}
            totalHoldings={totalHoldings} simulation={simulation}
            totalMonthlyIncome={totalMonthlyIncome} household={household} />
          <HouseholdInclusion plan={plan} setField={setField} scopeFor={scopeFor} />
        </div>
        <div className="space-y-6 2xl:col-span-7">
          <ProjectionChart
            plan={plan} simulation={simulation} age={age} lifeExpectancy={lifeExpectancy}
            expectedXIRR={expectedXIRR} postRetireReturn={postRetireReturn}
            investmentStepUp={investmentStepUp} investSurplus={investSurplus}
            exitTaxRate={exitTaxRate} earliestRetireAge={earliestRetireAge}
            goalPoints={goalPoints} policyPoints={policyPoints} household={household}
          />
        </div>
      </div>
      <div className="text-center pt-6 pb-2">
        <p className="text-help" style={{ color: 'var(--text-muted)' }}>Not financial advice · Consult a SEBI-registered advisor</p>
      </div>
      {netWorthEnabled && <div className="mx-auto max-w-lg space-y-3 text-center">
        {netWorthSave.message && <InfoStrip tone={netWorthSave.status === "error" ? "red" : "green"}>{netWorthSave.message}</InfoStrip>}
        <Button variant="cta" size="lg" className="gap-2" onClick={submitNetWorth} disabled={netWorthSave.status === "saving"}>
          <Save size={ICON_SIZE.md} /> {netWorthSave.status === "saving" ? "Saving and loading..." : netWorthSave.status === "error" ? "Retry save and reload" : netWorthSave.status === "saved" ? "Update saved plan" : "Save plan to my account"}
        </Button>
      </div>}
    </div>
  );
}
