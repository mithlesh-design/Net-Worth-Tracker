"use client";

import { useMemo, useState } from "react";
import InvestmentStrategy from "@/components/sections/InvestmentStrategy";
import TaxWall from "@/components/sections/TaxWall";
import MonthlyInvestments from "@/components/sections/MonthlyInvestments";
import CurrentHoldings from "@/components/sections/CurrentHoldings";
import PropertyInvestments from "@/components/sections/PropertyInvestments";
import MiniChart from "@/components/wizard/MiniChart";
import SuccessScore from "@/components/sections/SuccessScore";
import { Tabs, TabsList, TabsTrigger, TabsContent, InfoStrip } from "@/components/ui";
import { runProjectionV1 } from "@/lib/finance/projection.mjs";
import { buildContributionPlan } from "@/lib/finance/contributions.mjs";
import {
  SELF, people, personLabel, personPlan, personAge, memberPlan, RELATIONSHIPS,
} from "@/lib/household/members.mjs";

/* The levers first, the data entry below them. The old Investments step opened
   on two long forms with no feedback at all, so the user filled in twenty
   fields before learning anything. Here the things that move the outcome are
   at the top and the forms that feed them are collapsed underneath, with the
   Success Score as the hero above everything.

   The score is the household's, one figure for everyone included. Everything
   below it belongs to one person: a tab per household member, built from the
   members added on Income & Expenses — there is no way to add anyone here. */
export default function StepStrategyHub({
  plan, cleanPlan, scopeFor, makeId,
  successScore, scoreStale, goalGap, lifeExpectancy,
}) {
  const everyone = people(plan);
  const [activeId, setActiveId] = useState(SELF);
  /* A removed member's tab falls back to yours rather than to nothing. */
  const active = everyone.some((p) => p.id === activeId) ? activeId : SELF;
  const household = everyone.length > 1;

  const nameOf = (id) => (id === SELF ? "You" : personLabel(plan, id));
  const included = everyone.filter((p) => p.included).map((p) => nameOf(p.id));
  const excluded = everyone.filter((p) => !p.included).map((p) => nameOf(p.id));
  const caption = household
    ? `Household: ${included.join(", ") || "nobody"}${excluded.length ? ` · ${excluded.join(", ")} not included` : ""}. Change who counts on Review.`
    : null;

  const personProps = { plan, cleanPlan, scopeFor, makeId, household };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Strategy Hub
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {household
            ? "One success score for the household, then each person's own strategy and portfolio."
            : "The assumptions driving your projection, and the portfolio behind them."}
        </p>
      </div>

      <SuccessScore
        result={successScore}
        stale={scoreStale}
        hasGoals={!!goalGap?.hasGoals}
        lifeExpectancy={lifeExpectancy}
        caption={caption}
      />

      {/* No tab bar for one person: a single "My Plan" tab is clutter. */}
      {household ? (
        <Tabs
          value={String(active)}
          onValueChange={(v) => setActiveId(everyone.find((p) => String(p.id) === v)?.id ?? SELF)}
        >
          <TabsList aria-label="Whose strategy">
            {everyone.map((p) => (
              <TabsTrigger key={p.id} value={String(p.id)}>
                {p.id === SELF ? "My Plan" : personLabel(plan, p.id)}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Radix mounts only the active panel, so only the visible person's
              projection is ever computed. */}
          {everyone.map((p) => (
            <TabsContent key={p.id} value={String(p.id)} className="pt-5">
              <PersonStrategy personId={p.id} {...personProps} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <PersonStrategy personId={SELF} {...personProps} />
      )}
    </div>
  );
}

/* One person's strategy, projection and investment data. Every card here is
   handed that person's view of the plan and a setField that writes relative to
   them, so the same components serve you and every member. */
function PersonStrategy({ plan, cleanPlan, scopeFor, makeId, personId, household }) {
  const isSelf = personId === SELF;
  const scope = scopeFor(personId);
  const view = personPlan(plan, personId);
  const person = people(plan).find((p) => p.id === personId);
  const label = isSelf ? "You" : personLabel(plan, personId);
  const age = personAge(plan, personId);

  /* Their money against their share of the costs — not the household figure,
     which lives on Review. */
  const simulation = useMemo(
    () => runProjectionV1(memberPlan(cleanPlan, personId)),
    [cleanPlan, personId]);
  const cplan = buildContributionPlan(view);
  const totalHoldings = Object.values(view.holdings ?? {})
    .reduce((s, v) => s + (Number(v) || 0), 0);

  const share = person?.costShare ?? 0;
  const earns = (view.incomes ?? []).some((i) => (Number(i.amount) || 0) > 0);
  const possessive = isSelf ? "Your" : `${label}'s`;

  return (
    <div className="space-y-6">
      {household && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {isSelf ? "Your plan" : label}
          </span>
          {!isSelf && ` · ${(RELATIONSHIPS[person?.relationship] ?? RELATIONSHIPS.other).short}`}
          {age !== null && ` · ${age}`}
          {` · ${isSelf ? "retire" : "retires"} at ${view.retirementAge}`}
          {` · ${isSelf ? "carry" : "carries"} ${Math.round(share)}% of household costs`}
        </p>
      )}

      {/* Without it the number looks too good for no visible reason. */}
      {household && share === 0 && view.investSurplus && earns && (
        <InfoStrip tone="amber">
          {possessive} tab carries none of the household&rsquo;s
          costs, so all of {isSelf ? "your" : "their"} take-home pay counts as invested.
          Set {isSelf ? "your" : "their"} share under Budget &amp; Expenses &rarr; Who covers these costs.
        </InfoStrip>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <InvestmentStrategy
            plan={view} setField={scope.setField} cplan={cplan}
            simulation={simulation} totalHoldings={totalHoldings}
            defaultOpen
          />
          <TaxWall plan={view} setField={scope.setField} defaultOpen={false} />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <MiniChart
            simulation={simulation}
            currentAge={age}
            lifeExpectancy={plan.lifeExpectancy}
            retirementAge={view.retirementAge}
            title={household ? `${possessive} net worth projection` : undefined}
          />
        </div>
      </div>

      <div className="pt-2 space-y-4">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h3
            className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--text-muted)" }}
          >
            {possessive} investment data
          </h3>
          <span className="text-[0.6rem] text-right" style={{ color: "var(--text-subtle)" }}>
            Expand to edit what {isSelf ? "you hold and add" : "they hold and add"} each month
          </span>
        </div>
        <MonthlyInvestments
          plan={view} setField={scope.setField} findingsFor={scope.findingsFor}
          cplan={cplan} makeId={makeId}
        />
        <CurrentHoldings
          plan={view} setField={scope.setField} findingsFor={scope.findingsFor}
          totalHoldings={totalHoldings}
          startingPortfolio={isSelf ? simulation.openingPortfolio : null}
          /* The life-insurance and starting-portfolio notes are about your own
             cards; a member has no life insurance recorded. */
          showStartingPortfolioNote={isSelf}
        />
        <PropertyInvestments
          plan={view} setField={scope.setField} findingsFor={scope.findingsFor}
          makeId={makeId} simulation={simulation}
        />
      </div>
    </div>
  );
}
