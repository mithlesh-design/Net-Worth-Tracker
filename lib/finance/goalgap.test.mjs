/* Tests for the goal-gap surface.

   The load-bearing one is "prices goals exactly as the engine charges them".
   Everything else here is arithmetic; that one is the contract. If goalgap.mjs
   and projection.mjs ever disagree about what a financed goal costs, the Goal
   Workspace shows a gap the Review step says does not exist, and neither
   screen is obviously the wrong one. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runProjectionV1, goalsDueAt } from "./projection.mjs";
import { computeGoalGap } from "./goalgap.mjs";

const load = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));

const FIXTURES = ["v1-default", "v1-goals-heavy"];

const gapFor = (plan) => computeGoalGap(plan, runProjectionV1(plan));

/* ── The contract with the engine ────────────────────────────────────────── */

for (const name of FIXTURES) {
  test(`${name}: prices goals exactly as the engine charges them`, () => {
    const plan = load(name);
    const { goals } = gapFor(plan);

    const ages = new Set(goals.map((g) => g.age));
    for (const age of ages) {
      const mine = goals
        .filter((g) => g.age === age)
        .reduce((s, g) => s + g.requiredToday, 0);
      assert.equal(mine, goalsDueAt(plan, age), `disagreement at age ${age}`);
    }
  });

  test(`${name}: never mutates the plan or the simulation`, () => {
    const plan = load(name);
    const simulation = runProjectionV1(plan);
    const planBefore = structuredClone(plan);
    const simBefore = structuredClone(simulation);

    computeGoalGap(plan, simulation);

    assert.deepEqual(plan, planBefore);
    assert.deepEqual(simulation, simBefore);
  });

  test(`${name}: the series aligns index-for-index with the projection`, () => {
    const plan = load(name);
    const simulation = runProjectionV1(plan);
    const { series } = computeGoalGap(plan, simulation);

    assert.equal(series.length, simulation.data.length);
    series.forEach((p, i) => {
      assert.equal(p.age, simulation.data[i].age);
      assert.equal(p.projected, simulation.data[i].netWorth);
    });
  });

  test(`${name}: no non-finite number anywhere in the result`, () => {
    const out = gapFor(load(name));
    const walk = (v, path) => {
      if (typeof v === "number") {
        assert.ok(Number.isFinite(v), `${path} is ${v}`);
      } else if (Array.isArray(v)) {
        v.forEach((x, i) => walk(x, `${path}[${i}]`));
      } else if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
      }
    };
    walk(out, "goalGap");
  });
}

/* ── Financing ───────────────────────────────────────────────────────────── */

test("a financed goal demands only its down payment", () => {
  const plan = load("v1-default");
  const home = gapFor(plan).goals.find((g) => g.name === "Buy Home");

  assert.equal(home.hasLoan, true);
  assert.equal(home.fullCostToday, 8000000);
  assert.equal(home.requiredToday, 1600000);   // 20% of 80 L
  assert.notEqual(home.requiredToday, home.fullCostToday);
});

/* ── Inflation ───────────────────────────────────────────────────────────── */

test("at 0% inflation an unappreciating goal is not priced up", () => {
  const plan = { ...load("v1-default"), inflationRate: 0 };
  const edu = gapFor(plan).goals.find((g) => g.name === "Kid's Education");

  assert.equal(edu.inflationUsed, 0);
  assert.equal(edu.requiredInflated, edu.requiredToday);
  assert.equal(edu.inflationGap, 0);
});

test("a goal with appreciationRate is priced up at that rate, not general inflation", () => {
  const plan = load("v1-default");                 // inflation 6, home appreciation 5
  const { goals } = gapFor(plan);
  const home = goals.find((g) => g.name === "Buy Home");
  const edu = goals.find((g) => g.name === "Kid's Education");

  assert.equal(home.inflationUsed, 5);
  assert.equal(edu.inflationUsed, 6);

  const expected = home.requiredToday * Math.pow(1.05, home.yearsAway);
  assert.ok(Math.abs(home.requiredInflated - expected) < 1);
});

test("useAppreciationForAssets:false falls back to general inflation", () => {
  const plan = load("v1-default");
  const out = computeGoalGap(plan, runProjectionV1(plan), { useAppreciationForAssets: false });
  const home = out.goals.find((g) => g.name === "Buy Home");

  assert.equal(home.inflationUsed, 6);
});

test("inflationGap is the whole difference between today's and target-age pricing", () => {
  const plan = load("v1-default");
  for (const g of gapFor(plan).goals) {
    assert.ok(Math.abs(g.inflationGap - (g.requiredInflated - g.requiredToday)) < 1e-6);
  }
});

/* ── The requirement series ──────────────────────────────────────────────── */

test("the requirement drops by exactly the goal's inflated cost at its target age", () => {
  const plan = load("v1-default");
  const { series, goals, discountRate } = gapFor(plan);
  const byAge = new Map(series.map((p) => [p.age, p]));

  for (const g of goals) {
    if (g.status === "outOfHorizon" || g.status === "inThePast") continue;
    const before = byAge.get(g.age - 1);
    const at = byAge.get(g.age);
    if (!before || !at) continue;

    /* Rolling the prior year forward one year of discounting must land on this
       year's requirement plus the goal that just came due. */
    const rolled = before.required * (1 + discountRate / 100);
    assert.ok(
      Math.abs(rolled - (at.required + g.requiredInflated)) < 1,
      `age ${g.age}: rolled ${rolled} vs ${at.required + g.requiredInflated}`
    );
  }
});

test("the requirement is zero once every goal is behind you", () => {
  const { series } = gapFor(load("v1-default"));
  assert.equal(series.at(-1).required, 0);
  assert.equal(series.at(-1).requiredFV, 0);
});

test("requiredFV is the undiscounted sum of everything still ahead", () => {
  const plan = load("v1-default");
  const { series, goals } = gapFor(plan);
  const first = series[0];
  const ahead = goals
    .filter((g) => g.age > first.age && g.status !== "outOfHorizon")
    .reduce((s, g) => s + g.requiredInflated, 0);

  assert.ok(Math.abs(first.requiredFV - ahead) < 1);
});

test("floor and gapHeight stack to exactly the requirement line", () => {
  /* The two are stacked areas in the chart: an invisible floor, then the gap
     band on top. Their sum must land on the gold line and nowhere else — if it
     tracked the navy line instead, the band would paint over the corpus
     wherever the plan is ahead of its goals. */
  for (const p of gapFor(load("v1-default")).series) {
    assert.equal(p.floor, Math.min(p.projected, p.required));
    assert.equal(p.gapHeight, Math.max(0, p.required - p.projected));
    assert.ok(Math.abs(p.floor + p.gapHeight - p.required) < 1e-6);
  }
});

/* ── Same-age ordering ───────────────────────────────────────────────────── */

test("same-age goals fund in plan.goals array order", () => {
  /* A corpus deliberately sized to cover the first goal and not the second. */
  const plan = load("v1-default");
  plan.holdings = { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0, unallocated: 1000000 };
  plan.incomes = [];
  plan.expenses = { household: 0, rent: 0 };
  plan.contributions.mfSip.amount = 0;
  plan.legacy.monthlyInvestment = 0;
  plan.goals = [
    { id: 1, name: "First", emoji: "other", age: 29, amount: 900000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0 },
    { id: 2, name: "Second", emoji: "other", age: 29, amount: 900000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0 },
  ];

  const { goals } = gapFor(plan);
  const first = goals.find((g) => g.name === "First");
  const second = goals.find((g) => g.name === "Second");

  assert.ok(first.projectedAvailable > second.projectedAvailable,
    `expected the first-listed goal to be funded first, got ${first.projectedAvailable} vs ${second.projectedAvailable}`);
  assert.equal(first.projectedAvailable, first.requiredToday);
});

/* ── Horizon edges ───────────────────────────────────────────────────────── */

test("a goal past lifeExpectancy is reported, not silently dropped", () => {
  const plan = load("v1-goals-heavy");      // carries a goal at 92 against LE 80
  const { goals, totals } = gapFor(plan);
  const beyond = goals.find((g) => g.age > plan.lifeExpectancy);

  assert.ok(beyond, "the goal must still appear in the list");
  assert.equal(beyond.status, "outOfHorizon");
  assert.equal(beyond.projectedAvailable, null);

  /* The engine never charges it, so it must not inflate the totals either. */
  const inHorizon = goals.filter((g) => g.status !== "outOfHorizon" && g.status !== "inThePast");
  assert.equal(totals.requiredToday, inHorizon.reduce((s, g) => s + g.requiredToday, 0));
});

test("a goal before the current age is excluded from the totals", () => {
  const plan = load("v1-default");
  plan.goals = [
    { id: 9, name: "Already happened", emoji: "other", age: 20, amount: 500000,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0 },
  ];

  const { goals, totals, hasGoals } = gapFor(plan);
  assert.equal(goals[0].status, "inThePast");
  assert.equal(totals.requiredToday, 0);
  assert.equal(hasGoals, false);
});

/* ── Degenerate inputs ───────────────────────────────────────────────────── */

test("no goals gives a zero requirement and reports allFunded", () => {
  const plan = { ...load("v1-default"), goals: [] };
  const out = gapFor(plan);

  assert.equal(out.hasGoals, false);
  assert.equal(out.allFunded, true);
  assert.equal(out.worstGapAge, null);
  assert.ok(out.series.every((p) => p.required === 0 && p.gapHeight === 0));
});

test("a zero-amount goal is fully funded rather than 0/0", () => {
  const plan = load("v1-default");
  plan.goals = [
    { id: 1, name: "Free", emoji: "other", age: 40, amount: 0,
      hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
      appreciationRate: 0, maintenancePct: 0 },
  ];

  const g = gapFor(plan).goals[0];
  assert.equal(g.fundedPct, 1);
  assert.equal(g.gap, 0);
  assert.ok(Number.isFinite(g.fundedPct));
});

test("an empty projection returns an empty, well-formed result", () => {
  const plan = { ...load("v1-default"), lifeExpectancy: 20 };
  const out = gapFor(plan);

  assert.deepEqual(out.series, []);
  assert.deepEqual(out.goals, []);
  assert.equal(out.hasGoals, false);
});

/* ── The two verdicts stay separate ──────────────────────────────────────── */

test("funded% measures the plan against what it is CHARGED, not the real cost", () => {
  /* The bug this pins: dividing by requiredInflated marked every goal
     underfunded purely because the plan prices in today's rupees, so a plan
     with crores spare reported "37% funded" next to a chart showing the corpus
     far above the requirement line. Affordability and pricing are different
     problems and must not be blended into one percentage. */
  const out = gapFor(load("v1-default"));

  assert.equal(out.allFunded, true, "the default plan pays everything it is charged");
  assert.equal(out.totals.gap, 0);
  for (const g of out.goals) {
    assert.equal(g.fundedPct, 1, `${g.name} should read as fully funded`);
    assert.equal(g.gap, g.engineGap);
  }

  /* ...while the pricing story is still reported, just in its own field. */
  assert.ok(out.totals.inflationGap > 5000000);
});

test("a genuinely unaffordable goal still reports a shortfall", () => {
  const plan = load("v1-default");
  plan.holdings = { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0, unallocated: 0 };
  plan.incomes = [];
  plan.contributions.mfSip.amount = 0;
  plan.legacy.monthlyInvestment = 0;

  const out = gapFor(plan);
  assert.equal(out.allFunded, false);
  assert.ok(out.totals.gap > 0);
  assert.ok(out.goals.some((g) => g.status === "unfunded" || g.status === "partial"));
});

test("coversRealCost tracks the band, allFunded tracks the charges", () => {
  const out = gapFor(load("v1-default"));
  assert.equal(out.coversRealCost, out.crossoverAge != null);
  /* On the default profile both are true but they are computed independently —
     one from the series, one from per-goal charges. */
  assert.equal(out.allFunded, true);
  assert.equal(out.coversRealCost, true);
});

/* ── crossoverAge ────────────────────────────────────────────────────────── */

test("crossoverAge is the age from which the corpus stays above the requirement", () => {
  const out = gapFor(load("v1-default"));
  const { series, crossoverAge } = out;

  assert.ok(crossoverAge != null);
  const idx = series.findIndex((p) => p.age === crossoverAge);
  assert.ok(idx >= 0);

  /* Nothing short from there on... */
  assert.ok(series.slice(idx).every((p) => p.gapHeight <= 1));
  /* ...and the year before it, if there is one, was short. */
  if (idx > 0) assert.ok(series[idx - 1].gapHeight > 1);
});

test("a plan that is never behind crosses on its first row", () => {
  const plan = load("v1-default");
  plan.holdings = { ...plan.holdings, mf: 500000000 };
  const out = gapFor(plan);
  assert.equal(out.crossoverAge, out.series[0].age);
});

/* ── plan.inflateGoals ───────────────────────────────────────────────────── */

test("inflateGoals defaults off and changes nothing", () => {
  const plan = load("v1-default");
  assert.equal(plan.inflateGoals ?? false, false);

  const off = { ...plan, inflateGoals: false };
  assert.deepEqual(runProjectionV1(off), runProjectionV1(plan));
});

test("inflateGoals on makes the engine charge the target-age cost", () => {
  const plan = load("v1-default");
  const off = runProjectionV1({ ...plan, inflateGoals: false });
  const on = runProjectionV1({ ...plan, inflateGoals: true });

  const edu = plan.goals.find((g) => g.name === "Kid's Education");
  const rowOff = off.data.find((r) => r.age === edu.age);
  const rowOn = on.data.find((r) => r.age === edu.age);

  assert.equal(rowOff.goalCost, edu.amount);
  assert.ok(rowOn.goalCost > rowOff.goalCost * 2,
    `expected the inflated charge to be far higher, got ${rowOn.goalCost} vs ${rowOff.goalCost}`);

  const years = edu.age - plan.currentAge;
  const expected = edu.amount * Math.pow(1 + plan.inflationRate / 100, years);
  assert.ok(Math.abs(rowOn.goalCost - expected) < 2);
});

test("inflateGoals on collapses the inflation gap to zero", () => {
  /* The whole point of the toggle: with it on, the engine is already charging
     target-age prices, so the Goal Workspace and the Review step are looking
     at the same numbers and there is no pricing gap left to explain. */
  const plan = { ...load("v1-default"), inflateGoals: true };
  const out = gapFor(plan);

  assert.equal(Math.round(out.totals.inflationGap), 0);
  for (const g of out.goals) {
    assert.ok(Math.abs(g.requiredInflated - g.requiredToday) < 1e-6);
  }
});

test("the gap surface tracks the engine in BOTH toggle positions", () => {
  /* The contradiction this toggle exists to remove: whichever way it is set,
     what the chart says a goal needs must equal what the engine charges. */
  for (const inflateGoals of [false, true]) {
    const plan = { ...load("v1-default"), inflateGoals };
    const { goals } = gapFor(plan);

    for (const age of new Set(goals.map((g) => g.age))) {
      const mine = goals.filter((g) => g.age === age)
        .reduce((s, g) => s + g.requiredToday, 0);
      const engine = goalsDueAt(plan, age, plan.currentAge);
      assert.ok(Math.abs(mine - engine) < 1e-6,
        `inflateGoals=${inflateGoals}, age ${age}: ${mine} vs ${engine}`);
    }
  }
});

test("inflateGoals on prices a financed goal's loan in the same year's rupees", () => {
  /* The down payment and the loan it implies must come from one cost, or the
     EMI stream would be sized off an un-inflated principal. */
  const plan = { ...load("v1-default"), inflateGoals: true };
  const home = plan.goals.find((g) => g.name === "Buy Home");
  const { data } = runProjectionV1(plan);

  const years = home.age - plan.currentAge;
  const cost = home.amount * Math.pow(1 + home.appreciationRate / 100, years);
  const row = data.find((r) => r.age === home.age);

  assert.ok(Math.abs(row.goalCost - cost * (home.downPaymentPct / 100)) < 2);

  /* Property value at purchase must be the inflated cost, not the entered one. */
  assert.ok(row.totalPropertyValue > home.amount);
});

/* ── The default profile, end to end ─────────────────────────────────────── */

test("the default profile is engine-funded but shows an inflation gap", () => {
  /* This is the case that drove the inflateGoals toggle: the engine charges
     today's rupees and reports every goal funded, while the real cost at the
     target age is far higher. Both facts have to be visible at once. */
  const out = gapFor(load("v1-default"));

  assert.equal(out.totals.engineGap, 0, "the engine funds every goal");
  assert.ok(out.totals.inflationGap > 5000000, "but target-age pricing is much higher");
  assert.ok(out.totals.inflationGap > out.totals.engineGap);
});
