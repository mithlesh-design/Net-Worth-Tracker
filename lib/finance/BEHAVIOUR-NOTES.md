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

### 1. Tax is computed on the aggregate gross pool

v0 called `calcIncomeTax` on the summed income of every source, which was
correct only because every source was implicitly gross. v1 adds a per-source
`basis` of gross or take-home, and partitions before taxing:

```
tax = calcIncomeTax(sum of gross sources)      // one slab pass
postTax = (gross - tax) + sum of take-home sources
```

It must stay one call on the sum. `calcIncomeTax` grants the ₹75,000 standard
deduction, the nil slab and the rebate once per call, so summing it per source
grants all three once per source. Two ₹12L gross sources would report **zero**
tax instead of roughly ₹2.6L.

Migration sets `basis: "gross"` on every v0 income, which reproduces v0
behaviour exactly.

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
- **Property is excluded from net worth**, as in v0, and a cash-bought home is
  still not tracked as an asset at all.
- **A take-home income source grows at its stated rate**, which implies a frozen
  effective tax rate over the horizon.
- **The section 87A rebate cliff is unchanged from v0.** At ₹12,00,000 taxable
  the tax is zero; one rupee more costs roughly ₹60,000. Real law grants
  marginal relief. Changing this requires verifying current rules against
  official sources and is out of scope here.
