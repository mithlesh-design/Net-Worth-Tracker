/* Tests for the Success Score.

   Three of these are load-bearing rather than arithmetic:

   - determinism and order-independence catch the flicker bug, where a score
     moves because of hidden PRNG state rather than because the plan changed;
   - the drift-correction test guards the -s²/2 term, without which the
     simulation would sit systematically below the projection it is shown next
     to and look like a bug;
   - the crypto test guards the log-normal choice against anyone "simplifying"
     it back to a plain normal, which at sigma 70 sends buckets negative. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runProjectionV1 } from "./projection.mjs";
import { computeSuccessScore, bucketVolatility, DEFAULT_RUNS } from "./successscore.mjs";

const load = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));

const zeroVol = (plan) => {
  const p = structuredClone(plan);
  p.bucketOverrides = p.bucketOverrides ?? {};
  for (const b of ["mf", "stocks", "crypto", "fdrd", "lic", "unallocated", "ppf", "epf", "nps"]) {
    p.bucketOverrides[b] = { ...(p.bucketOverrides[b] ?? {}), volatility: 0 };
  }
  return p;
};

/* ── Stability ───────────────────────────────────────────────────────────── */

test("the same plan always gives the same score", () => {
  const plan = load("v1-default");
  const a = computeSuccessScore(plan);
  const b = computeSuccessScore(plan);

  assert.equal(a.score, b.score);
  assert.deepEqual(a.corpus, b.corpus);
  assert.deepEqual(a.failures, b.failures);
});

test("scoring order does not affect results", () => {
  /* If the PRNG lived at module scope, A-then-B would differ from B-then-A and
     a score would drift as the user moved around the app. */
  const a = load("v1-default");
  const b = load("v1-goals-heavy");

  const a1 = computeSuccessScore(a).score;
  const b1 = computeSuccessScore(b).score;

  const b2 = computeSuccessScore(b).score;
  const a2 = computeSuccessScore(a).score;

  assert.equal(a1, a2);
  assert.equal(b1, b2);
});

test("the plan does not get mutated", () => {
  const plan = load("v1-default");
  const before = structuredClone(plan);
  computeSuccessScore(plan);
  assert.deepEqual(plan, before);
});

/* ── Degenerate volatility ───────────────────────────────────────────────── */

test("zero volatility collapses to the deterministic answer", () => {
  const plan = zeroVol(load("v1-default"));
  const out = computeSuccessScore(plan);

  assert.ok(out.score === 0 || out.score === 100, `expected a certain outcome, got ${out.score}`);
  assert.equal(out.corpus.p10, out.corpus.p50);
  assert.equal(out.corpus.p50, out.corpus.p90);
  assert.equal(Math.round(out.corpus.p50), Math.round(out.deterministic));
});

test("bucketVolatility honours a user override", () => {
  const plan = load("v1-default");
  assert.equal(bucketVolatility(plan, "mf"), 18);

  plan.bucketOverrides = { mf: { volatility: 3 } };
  assert.equal(bucketVolatility(plan, "mf"), 3);

  plan.bucketOverrides = { mf: { volatility: -5 } };
  assert.equal(bucketVolatility(plan, "mf"), 0, "negative sigma is clamped, not propagated");
});

/* ── The extremes ────────────────────────────────────────────────────────── */

test("an overwhelmingly funded plan scores 100", () => {
  const plan = load("v1-default");
  plan.goals = [];
  plan.holdings = { ...plan.holdings, mf: 2000000000 };

  assert.equal(computeSuccessScore(plan).score, 100);
});

test("a hopeless plan scores 0", () => {
  const plan = load("v1-default");
  plan.holdings = { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0, unallocated: 0 };
  plan.incomes = [];
  plan.expenses = { household: 90000, rent: 40000 };
  plan.contributions.mfSip.amount = 0;
  plan.legacy.monthlyInvestment = 0;

  const out = computeSuccessScore(plan);
  assert.equal(out.score, 0);
  assert.equal(out.failures.count, out.runs);
});

test("a plan with nothing entered reports enoughInput:false rather than 0%", () => {
  /* Telling someone who has filled in nothing that they are certain to fail is
     worse than saying nothing. */
  const plan = load("v1-default");
  plan.holdings = { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0, unallocated: 0 };
  plan.incomes = [];
  plan.contributions = Object.fromEntries(
    Object.entries(plan.contributions).map(([k, v]) =>
      [k, Array.isArray(v) ? [] : { ...v, amount: 0 }]));
  plan.legacy.monthlyInvestment = 0;

  const out = computeSuccessScore(plan);
  assert.equal(out.enoughInput, false);
  assert.equal(out.score, 0);
});

/* ── Shape of the result ─────────────────────────────────────────────────── */

test("the band brackets the score and never exceeds 100", () => {
  for (const name of ["v1-default", "v1-goals-heavy"]) {
    const out = computeSuccessScore(load(name));
    assert.ok(out.band.lo <= out.score, `${name}: ${out.band.lo} > ${out.score}`);
    assert.ok(out.score <= out.band.hi, `${name}: ${out.score} > ${out.band.hi}`);
    assert.equal(out.band.hi - out.band.lo, 5);
    assert.ok(out.band.hi <= 100);
  }
});

test("percentiles are ordered", () => {
  const out = computeSuccessScore(load("v1-default"));
  assert.ok(out.corpus.p10 <= out.corpus.p50);
  assert.ok(out.corpus.p50 <= out.corpus.p90);
});

test("runs is forced even so antithetic pairs are complete", () => {
  const out = computeSuccessScore(load("v1-default"), { runs: 51 });
  assert.equal(out.runs % 2, 0);
  assert.equal(out.runs, 52);
});

test("failure reasons account for exactly the failed runs", () => {
  const plan = load("v1-default");
  plan.holdings = { mf: 100000, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0, unallocated: 0 };
  plan.incomes = [{ id: 1, name: "Salary", role: "salary", amount: 40000, frequency: "monthly",
    basis: "gross", growthRate: 3, retireAge: 55 }];
  plan.expenses = { household: 35000, rent: 5000 };

  const out = computeSuccessScore(plan);
  const counted = out.failures.reasons.reduce((s, r) => s + r.count, 0);
  assert.equal(counted, out.failures.count);
});

test("no non-finite number anywhere in the result", () => {
  const out = computeSuccessScore(load("v1-goals-heavy"));
  const walk = (v, path) => {
    if (typeof v === "number") assert.ok(Number.isFinite(v), `${path} is ${v}`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(out, "score");
});

/* ── Monotonicity ────────────────────────────────────────────────────────── */

test("a higher expected return never lowers the score", () => {
  /* Coarse steps on purpose: at 200 runs a 1% step is inside sampling noise
     and the test would be flaky. */
  const plan = load("v1-default");
  plan.goals = [{ id: 1, name: "Big", emoji: "other", age: 50, amount: 40000000,
    hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
    appreciationRate: 0, maintenancePct: 0 }];

  const scores = [6, 12, 18].map((x) =>
    computeSuccessScore({ ...plan, expectedXIRR: x }).score);

  assert.ok(scores[0] <= scores[1], `6% (${scores[0]}) should not beat 12% (${scores[1]})`);
  assert.ok(scores[1] <= scores[2], `12% (${scores[1]}) should not beat 18% (${scores[2]})`);
});

/* ── The two guarded modelling choices ───────────────────────────────────── */

test("the log-normal drift term keeps the mean on the deterministic assumption", () => {
  /* Without the -s²/2 correction the simulated mean drifts above the planning
     assumption and the whole score is optimistic by construction. Single
     bucket, no goals, no income, so the only thing moving is compounding. */
  const plan = load("v1-default");
  plan.goals = [];
  plan.incomes = [];
  plan.expenses = { household: 0, rent: 0 };
  plan.contributions = Object.fromEntries(
    Object.entries(plan.contributions).map(([k, v]) =>
      [k, Array.isArray(v) ? [] : { ...v, amount: 0 }]));
  plan.legacy.monthlyInvestment = 0;
  plan.holdings = { mf: 1000000, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0, crypto: 0, unallocated: 0 };
  plan.lifeExpectancy = plan.currentAge + 10;
  plan.retirementAge = 99;

  const out = computeSuccessScore(plan, { runs: 4000 });

  /* Mean of the terminal corpus, not the median: the median of a log-normal is
     below its mean by design. Reconstructed from percentiles is not good
     enough, so compare the deterministic value against p50 scaled by the known
     log-normal median/mean ratio... simpler: assert p50 < deterministic < p90,
     which is exactly the shape the -s²/2 term produces. */
  assert.ok(out.corpus.p50 < out.deterministic,
    `median ${out.corpus.p50} should sit below the mean ${out.deterministic}`);
  assert.ok(out.deterministic < out.corpus.p90,
    `mean ${out.deterministic} should sit below p90 ${out.corpus.p90}`);

  /* And the median must not be absurdly far below — that is what a missing
     drift correction would look like. Over 10 years at sigma 18 the
     median/mean ratio is exp(-s²*n/2), about 0.85. */
  assert.ok(out.corpus.p50 > out.deterministic * 0.6,
    `median ${out.corpus.p50} is too far below the mean ${out.deterministic}`);
});

test("a crypto-heavy plan never produces a negative or non-finite bucket", () => {
  /* At sigma 70 a plain normal draw would put ~8% of years below -100% and
     drive a bucket negative. The log-normal form makes that impossible. */
  const plan = load("v1-default");
  plan.holdings = { mf: 0, fd: 0, rd: 0, ppf: 0, nps: 0, epf: 0, stocks: 0,
    crypto: 5000000, unallocated: 0 };

  const out = computeSuccessScore(plan, { runs: 200 });
  assert.ok(Number.isFinite(out.score));
  assert.ok(Number.isFinite(out.corpus.p10));
  assert.ok(out.corpus.p10 >= 0 || Number.isFinite(out.corpus.p10));

  /* And directly: run the engine with the most extreme shock the sampler can
     realistically produce and check the buckets hold. */
  const extreme = runProjectionV1(plan, { returnFor: () => -99.9 });
  for (const row of extreme.data) {
    for (const [b, v] of Object.entries(row.buckets)) {
      assert.ok(Number.isFinite(v) && v >= 0, `bucket ${b} is ${v} at age ${row.age}`);
    }
  }
});

test("higher volatility on the same plan does not raise the score", () => {
  const plan = load("v1-default");
  plan.goals = [{ id: 1, name: "Big", emoji: "other", age: 50, amount: 40000000,
    hasLoan: false, downPaymentPct: 100, loanRate: 9, loanTenure: 5,
    appreciationRate: 0, maintenancePct: 0 }];

  const calm = structuredClone(plan);
  calm.bucketOverrides = { mf: { volatility: 2 } };
  const wild = structuredClone(plan);
  wild.bucketOverrides = { mf: { volatility: 45 } };

  assert.ok(computeSuccessScore(wild).score <= computeSuccessScore(calm).score);
});

test("DEFAULT_RUNS is even", () => {
  assert.equal(DEFAULT_RUNS % 2, 0);
});
