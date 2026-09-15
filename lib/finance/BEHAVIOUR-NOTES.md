# Engine behaviour: v0 → v1

`runProjection` (v0) is frozen and still exercised by the golden snapshots in
`fixtures/`. `runProjectionV1` is the bucket engine that replaces it. This file
records every intentional difference, so a change in the numbers can be
attributed rather than mistaken for a regression.

## Measured delta on the default profile

Fixture: `fixtures/v0-default.json`, migrated to v1 and run through both engines.

| | v0 | v1 |
|---|---|---|
| Peak net worth | ₹93.77 Cr | ₹80.39 Cr |
| Net worth at 85 | ₹93.77 Cr | ₹80.38 Cr |
| Corpus at 55 | ₹29.54 Cr | ₹30.24 Cr |
| FI age | 47 | 43 (sustained: never) |

Final net worth is **14.3% lower**. That figure is not a coincidence: it is
`1 / (1 - 0.125) - 1`, the exit-tax gross-up now applied to thirty years of
retirement withdrawals that v0 took tax-free. See change 2.

Corpus at 55 is *higher* because EMIs now start a year after purchase (change 4).

## The changes

### 1. Tax is computed on the aggregate gross pool — SUPERSEDED in v2

v0 called `calcIncomeTax` on the summed income of every source, which was
correct only because every source was implicitly gross. v1 added a per-source
`basis` of gross or take-home and partitioned before taxing, in one slab pass
over the summed gross pool.

v2 removes the tax model entirely. See "Income is take-home only" below. The
one-call-on-the-sum rule still governs `calcIncomeTax` itself, which survives
for the v1 → v2 migration and the frozen v0 engine.

### 2. Expense shortfalls are grossed up for exit tax

v0 was inconsistent: a goal was grossed up as `amount / (1 - exitTax)`, but a
living-expense shortfall and the entire post-retirement drawdown were
subtracted raw. v1 routes both through `drawFromBuckets`, so selling assets to
eat costs the same tax as selling assets to buy a house.

**This is the single largest source of the delta.** It makes every projection
that spends down a portfolio modestly worse, and more honest.

### 3. Net worth no longer compounds negatively

v0 ran `nw = nw * (1 + returnRate / 100) - spends` on an already-negative
balance, so a depleted plan compounded its *debt* at the investment return rate
and ran to minus tens of crores, entirely hidden behind a chart clamped to zero.
Two of the migration fixtures reach −₹33.70 Cr and −₹160.78 Cr this way.

v1 floors every bucket at zero and accumulates the gap in `cumUnfunded`, with
`unfundedThisYear` per row and a `depletionAge` on the result. The shortfall now
grows linearly at the annual spend rather than geometrically.

### 4. EMIs start the year after purchase

v0 charged a full year of EMI in the same year as the down payment
(`yearsElapsed < ls.tenure` from 0) and read `balances[yearsElapsed]`. v1 charges
from `yearsElapsed >= 1` and reads `balances[yearsElapsed - 1]`. This removes
roughly one year of overcharged EMI per financed goal.

### 5. Year 0 applies its outflows

v0's year-0 branch was `nw = nw + actualInvestment` — the only path with no
subtraction anywhere. A year-0 cash deficit was free money, and a profile
already retired at its starting age skipped a full year of withdrawals. v1 runs
one uniform ordering for every year and only skips the *growth* step at y=0,
since no time has elapsed. Contribution timing is otherwise unchanged.

**Consequence for the UI:** the first chart point is not the holdings total,
because year 0 still applies its own contributions and outflows. The Current
Holdings card shows the opening figure explicitly via `openingPortfolio`.

### 6. Retirement follows one explicit age

v0 derived `isRetired` from `incomes.every(inc => age >= inc.retireAge)` while
the chart's retirement line and the "Corpus at Retire" tile used
`Math.min(...retireAges)`. With more than one income source these disagreed, and
a single late-retiring source (rental income to 90) meant the post-retirement
return never engaged at all. v1 uses one explicit `plan.retirementAge`,
materialised at migration from the earliest source, driving the rate switch, the
contribution stop and the unlock check alike.

Also: `[].every()` is `true`, so a profile with no income sources was retired
from its starting age in v0.

### 7. Post-retirement return is a cap, not an override

`r = min(bucketReturn, postRetireReturn)`. A contractual PPF or EPF rate is not
downgraded to a general post-retirement assumption it never had.

### 8. The FI test bridges to the unlock date

v0: `liquidNW >= totalAnnualSpends * 25`, where `totalAnnualSpends` included
EMIs. Because EMIs terminate, the bar dropped sharply the year a loan ended and
FI appeared to "arrive" then. v1 excludes EMIs from the multiplier and adds a
liquidity condition:

```
liquid >= (present value of spending until the locked money unlocks)
AND (liquid + locked) >= 25 × recurring spend
```

When nothing is locked this collapses to the v0 test. `fiAgeSustained` reports
the first age from which the test holds in *every* later year; the latched
`fiAge` is kept for the existing tile.

## Field meanings that changed while keeping their names

Both are read by the existing tooltip, so the names were kept deliberately.

- **`goalCostGross`** — was `amount / (1 - exitTaxRate)`. Now the actual gross
  sold across buckets, which differs when the buckets drawn from carry different
  exit-tax rates or when the portfolio could not fully fund the goal.
- **`returnRate`** — was a single slider value. Now the balance-weighted blended
  return across the buckets actually held.

## Contribution and compounding timing

Unchanged from v0, and stated explicitly because the spec asks for it:

- **Annual lumps.** No intra-year compounding.
- **Growth first, then contributions.** Within a year the balance grows, then
  that year's contribution is added un-grown. So a contribution made in year *n*
  compounds for `horizon − n` years.
- **Year 0 does not compound.** Its contribution lands at t=0.

This understates a real monthly SIP by roughly `r/2` of the annual contribution
each year, around 7-8% of terminal corpus at 12% over 25 years. Changing the
convention moves every number in the app and belongs in its own release, where
the delta can be attributed. It is deliberately **not** part of this work.

## Known simplifications

Stated here and surfaced in the UI rather than left implicit.

- **No instrument-specific tax logic.** Every liquid bucket inherits the single
  existing exit-tax slider; PPF, EPF and NPS start at 0. All are user-editable.
  This is a simplification, not a tax rule.
- **NPS is counted at 100% from age 60.** The mandatory annuity share is not
  modelled, so spendable corpus is overstated for NPS-heavy plans.
- **Goal property is excluded from net worth**, as in v0, and a cash-bought home
  goal is still not tracked as an asset at all. Property you already own is a
  different thing and IS counted — see "Owned property" below.
- **The section 87A rebate cliff is unchanged from v0.** At ₹12,00,000 taxable
  the tax is zero; one rupee more costs roughly ₹60,000. Real law grants
  marginal relief. Changing this requires verifying current rules against
  official sources and is out of scope here.

## Income is take-home only (2026-09-15, schema v2)

### There is no tax model

`incomes[].basis` is gone. Every amount is what reaches the bank, and the engine
charges nothing against it. `row.grossIncome`, `row.incomeTax` and
`row.postTaxIncome` are replaced by a single `row.income`: with no tax the last
two were a constant zero and a duplicate of the first, and "gross" named a
distinction that no longer exists.

`calcIncomeTax` is retained. It is used by the v1 → v2 migration and by the
frozen v0 engine, and nowhere else.

### The migration rewrites stored salaries

A v1 gross amount carried across unchanged would be read as money reaching the
bank, inflating the profile by its own tax bill. `migrateV1toV2` therefore runs
one slab pass over the summed gross pool — the same single call v1 made — and
scales every gross source by `keep = (pool - tax) / pool`.

Scaling by one scalar is the pro-rata distribution: the weights are the
annualised amounts, so sharing out `pool - tax` by those weights and converting
back to each source's own frequency reduces to `amount * keep`.

The default profile converts ₹1,50,000/mo to **₹1,37,433/mo**
(`keep = 0.9162222`). Sources whose figure does not actually move — a zero row,
or any row when the whole pool falls under the rebate — are not flagged, so the
UI does not warn about a number that did not change.

The conversion reads no age and no date. `effectiveAge()` derives from
`personal.dob` and today, so consulting it would convert the same stored JSON
differently after a birthday, and the round-trip idempotence check would begin
failing on a date rather than on a code change. `retireAge` is ignored for the
same reason.

### Consequence: the effective tax rate is frozen, and plans get more optimistic

This is the significant behavioural change in v2, and it is inherent in dropping
the tax model rather than a flaw in the conversion.

v1 regrew a **gross** salary each year and re-ran the slabs on it, so a rising
earner climbed brackets and their effective rate rose with them. v2 grows the
converted **take-home** figure at the same rate, holding the year-0 effective
rate for the whole horizon.

The conversion is therefore exact in year 0 and diverges monotonically after it.
For the default profile — ₹18L gross growing at 10% — modelled income runs:

| age | v1 effective rate | v2 income ÷ v1 post-tax income |
|-----|-------------------|--------------------------------|
| 28  | 8.4%              | 1.000 |
| 40  | 23.4%             | 1.196 |
| 55  | 29.3%             | 1.297 |
| 85  | 31.1%             | 1.330 |

Net worth amplifies this, because the extra cash compounds into investments:
**+21% at age 40, +34% at 55, +96% at 85**, and FI arrives two years earlier
(43 → 41). The golden snapshots record exactly this.

The gap is widest for high-growth, high-income earners and negligible for
someone already entering take-home figures or growing slowly. Anyone whose real
salary growth outpaces their bracket creep is now over-projected.

### The rebate cliff is frozen into stored data

The section 87A cliff was already in the engine (below). v2 bakes it into the
saved amount: a ₹12,75,000 pool converts unchanged, while ₹12,76,000 loses
₹62,556. Same rule as before, but now applied once and persisted rather than
recomputed each year.

### Insurance premiums no longer inflate

`plan.medicalInflation` is gone and `insurancePremium` is charged flat, in
today's rupees. Over a long horizon this understates a real and fast-growing
cost: a ₹30,000 premium that would have reached ₹8.5L/yr by age 85 at 6% now
stays ₹30,000. The golden fixtures both disable medical cover, so the removal is
numerically inert on them.

## Owned property (2026-09-15)

### `plan.properties[]` is counted in net worth; goal property still is not

This reverses the v0/v1 rule for one case only, and the asymmetry is
deliberate.

`plan.properties[]` is what the user owns **today**. It opens the `property`
bucket, is counted in `totalNW`, and its outstanding loan is subtracted.

A home **goal** is a future purchase. Its `totalPropertyValue` and
`totalLoanOutstanding` are still recorded and still excluded from net worth,
exactly as before. Do not "fix" this to match: subtracting a goal's loan while
its asset value stays excluded would push net worth *down* for planning to buy a
house. The two halves are excluded together or not at all, and changing that is
a separate piece of work.

### De-duplication is structural, not advisory

Properties are owned from age 0; goals are bought at a future age. The two
describe disjoint periods, so the same asset cannot occupy both — provided the
user does not enter their future home in both places. The UI says so at the
point of entry and warns when a future home goal and a property coexist.

The alternatives were worse. A `linkedGoalId` creates two sources of truth for
price, rate and tenure plus a dangling reference on every goal deletion; fuzzy
duplicate detection is untestable and leaves the doubled number on screen while
apologising for it.

**Deferred:** rolling a completed home goal's value into the illiquid bucket at
`goal.age`. That is the honest fix both for "a cash-bought home is not tracked"
and for the asymmetry above, and it removes the user's reason to re-enter a goal
as a property. It belongs in its own release where the delta can be attributed.

### Property appreciates at the bucket rate, not a per-item rate

There is no per-property appreciation field. Property grows through the engine's
normal growth step at `BUCKET_DEFS.property.defaultReturn` (5%, overridable via
`bucketOverrides.property`), which means it also takes a volatility draw in the
Success Score. A per-item rate applied directly in `propertyYear` would bypass
that and model a house as risk-free, flattering every property-heavy plan.

### Gross value, debt subtracted separately

`B.property` holds the **gross** value; `owned.debt` is subtracted from
`totalNW`. Netting them into a single equity figure would make the growth step
appreciate the *equity* at the property rate — wrong, because the asset
appreciates while the loan amortises on its own schedule.

A heavily mortgaged property can therefore produce a negative `netWorthRaw` in
early years. `netWorth` already clamps at 0 for the chart; `netWorthRaw` carries
the truth.

### Where each figure lands in the waterfall

| figure | cash flow | `recurringSpend` (the FI test) | net worth |
|---|---|---|---|
| value | — | — | **counted** (illiquid) |
| loan outstanding | — | — | **subtracted** |
| EMI | charged | **excluded** — it terminates | — |
| maintenance | charged | **included** — you maintain it forever | — |
| rental income | added | — | — |

EMIs run from year 0, the opposite of `loanYear`: an owned property's loan is
already being serviced, so there is no purchase year to defer past.

Rent grows at `inflationRate` only, never `+ lifestyleCreep` — what a tenant
pays is not a choice about how the owner lives. It is not gated on `working`,
because the property is held through retirement and for many plans that is the
point of owning it.

### Rental income is not taxed

Consistent with every other income source after v2, which has no tax model. Real
rental income is taxed at slab rates after a 30% standard deduction, so the UI
labels the field "after tax" rather than letting the user enter a gross rent.

### Property does not bring FI forward

The FI test reads `liquidNW + lockedNW` and excludes `illiquidNW`, and
`blendedReturn` excludes illiquid buckets from both numerator and divisor. See
the comments at both sites; both look like oversights and are not.

## Goal gap and the Success Score (2026-09-14)

### `plan.inflateGoals` — default `false`

Goal amounts are entered in today's rupees. With the flag off the engine
charges exactly that at the target age, which is what every saved profile was
projected with; a ₹30 L education at 45 costs ₹30 L. With it on, `goalCostAt()`
ages the amount to the target year (₹80.78 L at 6%) and both charge sites —
`goalsDueAt` and `buildGoalLoanState` — read it, so a financed goal's down
payment and the loan it implies are never priced in different years' rupees.
`assetValue` inflates with it: a property bought later costs more precisely
because property appreciated.

`lib/finance/goalgap.mjs` calls the same helper, which is what stops the Goal
Workspace and the Review step disagreeing about what a goal costs.

### Goal-gap pricing uses `inflationRate`, or `appreciationRate` when set

Never `+ lifestyleCreep` — creep inflates a discretionary standard of living,
not the price of a degree. A goal carrying `appreciationRate > 0` is priced up
at that rate instead. Not double-counting: the engine applies
`appreciationRate` to the asset only *after* purchase (`loanYear`), never to
the purchase price.

### Per-goal funding is derived, never re-drawn

`goalgap.mjs` obtains each goal's funded amount from an identity on the
recorded row:

    goalUnfunded = min(row.unfundedThisYear, row.goalCost)

The engine draws `d1` (cash shortfall) then `d2` (goals) and records only their
sum. If `d1` left anything unfunded the portfolio was already empty, so
`unfundedThisYear >= goalCost`; if `d1` was funded then `unfundedThisYear` IS
`d2.unfunded <= goalCost`. Exact in both branches.

This is not merely tidier than splitting the engine's goal draw per goal — that
would **change numbers**. `drawFromBuckets` is not additive when per-bucket exit
tax rates differ within a tier: measured on a portfolio with crypto at 30% and
everything else at 12.5%, one draw of ₹8,00,000 raises ₹9,26,316 gross while two
draws of ₹4,00,000 raise ₹9,25,863 and leave different residual balances. The
`v1-goals-heavy` fixture carries such an override so the snapshot catches anyone
who tries.

Same-age goals fund in `plan.goals` array order.

### `runProjectionV1(plan, opts)` — `opts.returnFor`

Optional. Called as `returnFor(bucket, yearIndex, { working, age })` and used
**as-is**: the post-retirement cap is *not* applied on top.

That exception matters. The deterministic engine applies
`r = min(r, postRetireReturn)` after retirement — a cap, not an override, so a
contractual PPF rate is not silently downgraded. Applying that same cap to a
*random draw* is one-sided: a good year is clipped to the conservative
assumption while a bad year falls through untouched. Measured, it drained every
simulated retirement and scored the default profile at 15% when its own
projection ends at ₹80.38 Cr and never depletes. The Success Score therefore
applies the retirement adjustment to the **mean** before drawing, and scales
volatility with it (a shift into safer assets is less volatile as well as
lower-returning).

`returnFor` is deliberately not threaded into `blendedReturn`, which feeds the
FI bridge and each row's `returnRate`. In a simulated run those report the
*planning* assumption, not the realised path.

With no `opts`, every read falls through to `bucketReturn` plus the cap and the
output is identical to before the parameter existed — asserted in
`projection-opts.test.mjs`, and the v1 snapshots are byte-identical.

### Success Score modelling choices

- **Constant seed**, never derived from the plan. A plan-derived seed reshuffles
  every path on every keystroke, so a 1% slider nudge moves the score in an
  arbitrary direction — which reads as a broken app.
- **One shock per year, shared across buckets**, scaled by each bucket's sigma.
  Nine independent shocks would let buckets diversify each other down to
  near-zero portfolio volatility, which is not how Indian equity, NPS and crypto
  behave in a drawdown. Perfect correlation overstates the link and so widens
  the distribution — the conservative error for a number people act on. Stated
  in the UI.
- **Log-normal, not normal**, with a `−s²/2` drift term so `E[1+r]` equals the
  deterministic assumption. At crypto's sigma of 70 a plain normal puts roughly
  8% of years below −100% and drives buckets negative, which `drawFromBuckets`
  is not built to survive.
- **Antithetic variates**: odd runs negate the previous run's shocks. Free
  variance reduction; `runs` is forced even.
- **Success criterion** is `depletionAge === null`, which already means "funded
  every goal and never ran out" — `cumUnfunded` accumulates both the cash
  shortfall and the goal shortfall.
- The **median sits below** the deterministic projection by construction (the
  median of a log-normal is below its mean). Both are returned so the UI can
  show them side by side rather than looking like a bug.
