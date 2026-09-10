# Net Worth Tracker — Design Document

## 1. Overview

The Net Worth Tracker (branded **Financial Independence Planner**) is a Next.js 14 application for long-term financial planning, tailored to Indian financial instruments and tax rules. Users walk through a 5-step wizard to input their financial details, and the app projects their net worth over 50+ years, identifying when they reach financial independence.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | React 18.3, Tailwind CSS 3.4 |
| Charts | Recharts 2.12 |
| Icons | Lucide React 0.383 (line-style, 1.5–2px stroke) |
| Auth | NextAuth 4.24 (Google OAuth, JWT sessions) |
| Database | Supabase (profiles, multi-tenant) |
| Offline | localStorage (draft persistence, demo profiles) |
| Financial Logic | Pure ES modules (`.mjs`), no external libraries |

---

## 3. Directory Structure

```
app/
  layout.jsx                    Root layout — SessionProvider, ThemeProvider
  page.jsx                      Main state management + WizardShell render
  globals.css                   CSS custom properties (dark/light themes)
  auth/signin/page.jsx          Custom sign-in page
  auth/verify/page.jsx          Email verification
  api/auth/[...nextauth]/       NextAuth route handler
  api/profiles/route.js         List & create profiles (Supabase)
  api/profiles/[id]/route.js    Update & delete profiles

components/
  SessionProvider.jsx           NextAuth wrapper
  ThemeProvider.jsx              Dark/light theme context
  DemoAuthProvider.jsx           Frontend-only demo sessions
  AuthButton.jsx                User menu, profile save/load
  Img/                          Logo assets

  wizard/
    WizardShell.jsx             Step orchestrator with animations
    WizardProgress.jsx          Horizontal progress bar (5 steps)
    WizardNav.jsx               Bottom sticky Back/Next buttons
    MiniChart.jsx               Simplified chart for Step 2
    steps/
      StepAboutYou.jsx          Step 1: Personal details + timeline
      StepIncomeExpenses.jsx    Step 2: Income CRUD + expenses + mini chart
      StepProtection.jsx        Step 3: Medical & life insurance
      StepInvestments.jsx       Step 4: Holdings + contributions + strategy
      StepGoalsReview.jsx       Step 5: Full chart + goals + summary

  sections/                     Logical groupings of form inputs
    PersonalDetails.jsx         Name + DOB
    Timeline.jsx                Current age, retirement, life expectancy
    IncomeSources.jsx           CRUD incomes with growth & retire age
    BudgetExpenses.jsx          Household + rent + inflation rates
    MedicalInsurance.jsx        Self + parents coverage & premiums
    LifeInsurance.jsx           Sum assured vs. cash value
    CurrentHoldings.jsx         9 investment instrument balances
    MonthlyInvestments.jsx      Legacy SIP or detailed contributions
    InvestmentStrategy.jsx      XIRR, post-retirement return, step-up
    ContributionBlock.jsx       Reusable per-instrument contribution UI
    TaxWall.jsx                 Exit tax rate + bucket overrides
    FinancialGoals.jsx          CRUD goals (property, education, etc.)
    ProjectionChart.jsx         50-year Recharts AreaChart with goal markers
    MonthlySummary.jsx          KPI cards: FI age, target, on-track status

  ui/                           Reusable primitives
    SectionCard.jsx             Rounded container with title
    CollapsibleSection.jsx      SectionCard + chevron toggle (defaultOpen)
    TextField.jsx               Text input with label, hint, error
    SliderInput.jsx             Range slider + number input + word conversion
    SegmentedControl.jsx        Radio-like button group
    DateField.jsx               Date input with constraints
    ToggleSwitch.jsx            Boolean toggle
    YesNoField.jsx              Explicit yes/no (never undefined)
    DerivedStat.jsx             Read-only value display
    FieldError.jsx              Validation finding display
    AddItemButton.jsx           "+ Add" action
    ItemCard.jsx                Card for list items
    InfoStrip.jsx               Colored info box (blue, amber, red, sky, violet)
    index.js                    Barrel exports

lib/
  auth.js                       NextAuth authOptions (Google provider)
  supabase.js                   Supabase client factory

  finance/
    format.mjs                  fmt() -> "4.26 Cr", numToWordsIndian(), toAnnual()
    projection.mjs              runProjection() — v0 frozen golden engine
    tax.mjs                     calcIncomeTax() — Indian new regime slabs
    loans.mjs                   calcEMI(), loanScheduleYearly()
    insurance.mjs               annualPremium() — medical/life
    contributions.mjs           buildContributionPlan() — SIP aggregation
    age.mjs                     effectiveAge(), ageFromDob()
    assumptions.mjs             BUCKET_DEFS, instrument defaults, statutory limits
    drawdown.mjs                Retirement drawdown logic
    *.test.mjs                  Golden snapshot tests

  profile/
    schema.mjs                  DEFAULTS, FIRST_RUN_V0, serialize(), NAMED_CONTRIBUTIONS
    migrate.mjs                 migrate(v0) -> v1 schema upgrade
    validate.mjs                validate(plan) -> findings[], clampPlan()
    draft.mjs                   readDraft/writeDraft -> localStorage
    store.mjs                   getProfileStore(isDemo) -> { list, create, update, remove }
    fixtures/                   Test data

  demo/
    config.mjs                  DEMO_AUTH_ENABLED flag
    session.mjs                 makeDemoSession(), readDemoSession()
    profiles.mjs                localStorage-backed demo profiles

hooks/
  useMediaQuery.mjs             Responsive breakpoint hook
```

---

## 4. State Management

### Single Source of Truth

All financial state lives in a single `plan` object in `page.jsx`. It is never mutated directly — updates use `structuredClone` for immutability.

```js
const [plan, setPlan] = useState(DEFAULTS)
```

### Update Patterns

| Pattern | Example |
|---------|---------|
| Dot-path setter | `setField("expenses.rent", 25000)` |
| List item update | `updateIncome(id, "growthRate", 12)` |
| Add to list | `addIncome(newObj)` / `addGoal()` |
| Remove from list | `removeIncome(id)` / `removeGoal(id)` |

### Derived Data (useMemo)

Expensive computations are memoized with `[plan]` as the sole dependency:

- **Validation**: `validate(plan)` -> findings with path, message, severity
- **Contribution plan**: `buildContributionPlan(plan)` -> bucket totals, shortfalls
- **Insurance premiums**: `annualPremium(plan.medical, plan.life)`
- **Projection**: `runProjection(plan)` -> 50+ annual snapshots with net worth, cash flow, invested amounts

---

## 5. Plan Schema (v1)

```js
{
  schemaVersion: 1,
  personal: { fullName, dob },
  currentAge: 28,
  lifeExpectancy: 85,
  retirementAge: 55,

  incomes: [{ id, name, amount, frequency, basis, growthRate, retireAge }],
  expenses: { household, rent },
  inflationRate: 6,
  lifestyleCreep: 2,
  medicalInflation: 6,
  stopRentOnHomePurchase: true,

  medical: {
    self:    { enabled, coverage, premium, premiumFrequency },
    parents: { enabled, coverage, premium, premiumFrequency, premiumMode }
  },
  life: { /* ... */ },

  contributions: {
    mfSip: { amount, frequency, annualReturn, stepUp, fundedFromPayroll },
    nps, ppf, epf, epfEmployer, rd, lic,
    other: []   // User-added custom instruments
  },

  holdings: { mf, fd, rd, ppf, nps, epf, stocks, crypto, unallocated },
  lifeInsurance: { value, valueType, surrenderValue },

  expectedXIRR: 12,
  investmentStepUp: 10,
  postRetireReturn: 7,
  exitTaxRate: 12.5,
  investSurplus: true,
  surplusBucket: "mf",
  bucketOverrides: {},

  goals: [{
    id, name, emoji, age, amount,
    hasLoan, downPaymentPct, loanRate, loanTenure,
    appreciationRate, maintenancePct
  }]
}
```

**Conventions**: Money in INR (Number). Dates as ISO `YYYY-MM-DD`. Insurance booleans are explicit (never `undefined`). `null` means "not known"; `0` means "confirmed zero".

---

## 6. Component Hierarchy

```
RootLayout
  SessionProvider (NextAuth)
    DemoAuthProvider
      ThemeProvider
        FinancialPlanner (page.jsx — owns plan state)
          Header (logo, theme toggle, AuthButton)
          WizardShell
            WizardProgress (5 step bars, clickable)
            StepContent (animated transition)
              Step 1: PersonalDetails + Timeline
              Step 2: IncomeSources + BudgetExpenses + MiniChart
              Step 3: MedicalInsurance + LifeInsurance
              Step 4: CurrentHoldings + MonthlyInvestments + InvestmentStrategy + TaxWall
              Step 5: ProjectionChart + FinancialGoals + MonthlySummary + Timeline
            WizardNav (Back / Next / Skip / See Results)
```

---

## 7. Data Flow

```
User inputs (plan)
    |
    v
validate(plan) -> findings[] (path, message, severity)
    |
    v
clampPlan(plan) -> safe ranges enforced
    |
    v
buildContributionPlan(plan) -> { buckets, totals, shortfalls }
    |
    v
runProjection(plan) -> simulation[]
    |   (50+ annual snapshots: age, netWorth, invested, availableCash, ...)
    v
ProjectionChart (Recharts AreaChart)
MonthlySummary (FI age, target corpus, on-track status)
```

### Projection Engine (per year, currentAge to lifeExpectancy)

1. **Income**: Gross income (per-income growth rates) -> tax (Indian new regime) -> post-tax
2. **Expenses**: Household + rent + inflation + lifestyle creep
3. **Insurance**: Medical & life premiums deducted from post-tax income
4. **Loans**: EMIs for active goal loans
5. **Contributions**: Fill investment buckets from available cash
6. **Investment growth**: Apply expectedXIRR (or postRetireReturn after retirement)
7. **Drawdown**: Withdraw from locked buckets post-goal or post-retirement
8. **Output**: Annual snapshot with 20+ fields

---

## 8. Theming

Two modes via CSS custom properties on the `data-theme` attribute. **Light is the recommended default product experience** for the Financial Independence Planner; dark mode remains supported as an alternate theme.

```css
:root,
[data-theme="light"] {
  /* Brand */
  --brand-navy-950: #041F3A;
  --brand-navy-900: #062B51;
  --brand-navy-800: #0B365F;
  --brand-navy-700: #164A73;
  --brand-navy-100: #EAF1F6;
  --brand-navy-050: #F4F8FB;

  --brand-gold-600: #B78A2E;
  --brand-gold-500: #C9A14A;
  --brand-gold-400: #D9B967;
  --brand-gold-100: #F6EBCF;
  --brand-gold-050: #FBF7ED;

  /* Surfaces */
  --bg-primary: #F7F9FB;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #FAFBFC;
  --bg-warm: #F8F6EF;
  --surface-raised: #FFFFFF;
  --surface-muted: #F3F6F8;
  --surface-hover: #F0F5F8;
  --surface-selected: #EAF1F6;

  /* Text */
  --text-primary: #102231;
  --text-secondary: #536573;
  --text-muted: #7D8B96;
  --text-subtle: #98A4AE;
  --text-inverse: #FFFFFF;

  /* Borders */
  --border-default: #E1E7EB;
  --border-strong: #CCD6DD;
  --border-subtle: #EDF1F3;
  --focus-ring: #164A73;

  /* Semantic */
  --success: #21875A;
  --success-bg: #EAF7F0;
  --success-border: #B9E1CA;

  --warning: #B97816;
  --warning-bg: #FFF6E4;
  --warning-border: #F2D79E;

  --danger: #C94B4B;
  --danger-bg: #FCEEEE;
  --danger-border: #F0BABA;

  --info: #3275A8;
  --info-bg: #EDF6FC;
  --info-border: #C7E1F2;

  /* Financial states */
  --financial-positive: #21875A;
  --financial-negative: #C94B4B;
  --financial-neutral: #536573;
  --financial-target: #C9A14A;
  --financial-projection: #164A73;

  /* Interactive */
  --accent: #062B51;
  --accent-hover: #0B365F;
  --accent-active: #041F3A;
  --accent-soft: #EAF1F6;
  --accent-contrast: #FFFFFF;

  /* Overlay */
  --overlay: rgba(6, 43, 81, 0.36);
}

[data-theme="dark"] {
  /* Brand */
  --brand-navy-950: #EAF1F6;
  --brand-navy-900: #D9E5ED;
  --brand-navy-800: #B9CEDD;
  --brand-navy-700: #8FAFC4;
  --brand-navy-100: #18344B;
  --brand-navy-050: #122A3D;

  --brand-gold-600: #E4C36F;
  --brand-gold-500: #D9B967;
  --brand-gold-400: #E7CD8B;
  --brand-gold-100: #3C3423;
  --brand-gold-050: #2A261C;

  /* Surfaces */
  --bg-primary: #0D141A;
  --bg-secondary: #121C24;
  --bg-tertiary: #16222C;
  --bg-warm: #191813;
  --surface-raised: #17242E;
  --surface-muted: #1B2A34;
  --surface-hover: #22333E;
  --surface-selected: #1B3446;

  /* Text */
  --text-primary: #F4F7F9;
  --text-secondary: #C0CCD4;
  --text-muted: #8FA0AC;
  --text-subtle: #6F818D;
  --text-inverse: #102231;

  /* Borders */
  --border-default: #2A3A45;
  --border-strong: #3A4D59;
  --border-subtle: #21303A;
  --focus-ring: #D9B967;

  /* Semantic */
  --success: #4EB37B;
  --success-bg: #123124;
  --success-border: #28583E;

  --warning: #E2B55A;
  --warning-bg: #342A14;
  --warning-border: #665128;

  --danger: #E17171;
  --danger-bg: #351B1B;
  --danger-border: #633232;

  --info: #73B3DB;
  --info-bg: #162D3C;
  --info-border: #2C566F;

  /* Financial states */
  --financial-positive: #4EB37B;
  --financial-negative: #E17171;
  --financial-neutral: #A5B3BD;
  --financial-target: #D9B967;
  --financial-projection: #73A9CC;

  /* Interactive */
  --accent: #D9E5ED;
  --accent-hover: #FFFFFF;
  --accent-active: #B9CEDD;
  --accent-soft: #18344B;
  --accent-contrast: #102231;

  /* Overlay */
  --overlay: rgba(0, 0, 0, 0.56);
}
```

**ThemeProvider** reads `localStorage["nwp-theme"]`, sets `data-theme` on `<html>`, and provides a React context for the toggle. A mounted check prevents hydration mismatch.

### Color Usage

- **Navy**: Core brand, navigation, primary actions, key financial values, projection lines.
- **Gold**: Premium accent only — logo details, FI milestones, target markers, selected highlights.
- **Green**: Positive/on-track semantic state only; never the primary product accent.
- **Red**: Errors, shortfalls, depleted projections, and genuinely negative financial states only.
- **Warm neutrals**: Primary canvas and content surfaces.
- Recommended visual balance: **75% neutral / 20% navy / 5% gold + semantic accents**.

### Typography

- **Marketing headlines**: Playfair Display.
- **Product UI**: Manrope first, Inter fallback.
- **Financial values**: `font-variant-numeric: tabular-nums`.
- Avoid serif typography inside dense forms, tables, controls, and calculation summaries.
- Financial values should use stronger weight and contrast than their labels.

### Typography Tokens

```css
:root {
  --font-sans: "Manrope", "Inter", system-ui, -apple-system, sans-serif;
  --font-serif: "Playfair Display", Georgia, serif;

  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.5rem;      /* 40px */

  --leading-tight: 1.2;
  --leading-snug: 1.35;
  --leading-normal: 1.5;
  --leading-relaxed: 1.65;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

---

## 9. Authentication & Persistence

### Three Auth Modes

| Mode | Backend | Trigger |
|------|---------|---------|
| **Production** | NextAuth (Google OAuth) + Supabase | Default |
| **Demo** | sessionStorage session + localStorage profiles | `NEXT_PUBLIC_DEMO_AUTH=true` |
| **Draft** | localStorage auto-save (600ms debounce) | Always active |

### Profile Storage Abstraction

`getProfileStore(isDemo)` returns a unified `{ list, create, update, remove }` interface backed by either Supabase API calls or localStorage, depending on session type.

### Security

- JWT sessions (no database session table)
- `user_id` filter on every Supabase query is the **only tenant isolation** (service-role key bypasses RLS)
- `GOOGLE_CLIENT_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are never exposed to the client
- No PII in financial data (only age, income, goals — no names/emails stored in profile settings)

---

## 10. Financial Computation Modules

### Tax (`lib/finance/tax.mjs`)

Indian new regime slabs (2026):

| Slab | Rate |
|------|------|
| 0–3L | 0% |
| 3L–6L | 5% |
| 6L–9L | 10% |
| 9L–12L | 15% |
| 12L–15L | 20% |
| 15L+ | 30% |

Results are cached by income to avoid recalculation.

### Investment Instruments (`lib/finance/assumptions.mjs`)

9 instruments defined in `BUCKET_DEFS`, each with:
- `tier`: LIQUID or LOCKED
- `defaultReturn`: Expected annual return
- `lock`: Lock-in rule (age 58, age 60, PPF tenure)
- `rateIsEstimate`: Flag for market-linked instruments (NPS)

Statutory limits: PPF annual cap at 1.5L, PPF maturity offset 16 years.

### Loans (`lib/finance/loans.mjs`)

- `calcEMI(principal, rate, tenure)` — Standard EMI formula
- `loanScheduleYearly(principal, rate, tenure)` — Year-by-year amortization
- Used for property and education goal loans

### Contributions (`lib/finance/contributions.mjs`)

- `buildContributionPlan(plan)` — Aggregates 7 named instruments + custom
- Returns bucket breakdown, totals, and shortfall analysis
- Respects `fundedFromPayroll` (EPF not deducted from take-home cash)

### Formatting (`lib/finance/format.mjs`)

- `fmt(n)` -> "4.26 Cr" (Indian numbering: Lakh, Crore)
- `fmtAxis(v)` -> "2.4Cr" (compact for chart axes)
- `numToWordsIndian(n)` -> "Four Crore Twenty Six Lakh"
- `toAnnual(amount, frequency)` / `monthlyEquivalent(amount, frequency)`

---

## 11. Validation

`validate(plan)` returns an array of findings:

```js
{ path: "retirementAge", message: "Must be greater than current age", severity: "error" }
```

Checks include:
- DOB in future (error)
- Retirement age < current age (error)
- Income growth > 25% (warning)
- Goal amount > 50 Cr (warning)
- PPF contribution > 1.5L/year (error)
- Contribution shortfall (warning)

`clampPlan(plan)` enforces safe numeric ranges (0–100 for percentages, 18–100 for ages).

`<FieldError>` components render findings inline next to their source fields.

---

## 12. Wizard Flow

### Steps

| # | Name | Sections | Special |
|---|------|----------|---------|
| 1 | About You | PersonalDetails, Timeline | — |
| 2 | Income & Expenses | IncomeSources, BudgetExpenses | MiniChart |
| 3 | Protection | MedicalInsurance, LifeInsurance | Skippable |
| 4 | Investments & Assets | CurrentHoldings, MonthlyInvestments, InvestmentStrategy, TaxWall | — |
| 5 | Goals & Review | ProjectionChart, FinancialGoals, MonthlySummary, Timeline | Full chart |

### Navigation

- `goTo(step)` validates bounds, sets animation direction, scrolls to top
- 200ms CSS transitions (`wizard-step-enter`, `wizard-step-enter-back`)
- Progress bar: completed steps at 70% opacity, active at 100%, upcoming at 30%
- Steps are directly clickable on the progress bar
- Smart labels: "Continue" / "Skip this step" / "See Results"

---

## 13. API Routes

### `GET /api/profiles`

Lists all profiles for the authenticated user. Filters by `user_id = session.user.id`.

### `POST /api/profiles`

Creates a new profile. Body: `{ name, settings }`.

### `PUT /api/profiles/[id]`

Updates an existing profile. Verifies ownership via `user_id`.

### `DELETE /api/profiles/[id]`

Deletes a profile. Verifies ownership via `user_id`.

All routes require a valid NextAuth session. Supabase queries use the service-role key (RLS bypassed), so the `user_id` filter is the **sole tenant isolation mechanism**.

---

## 14. Performance

- **Memoization**: All expensive computations (`validate`, `buildContributionPlan`, `runProjection`) wrapped in `useMemo([plan])`
- **Immutability**: `structuredClone` on every update enables `React.memo` optimizations
- **Code splitting**: Wizard steps are separate components; Recharts only loaded on Steps 2 and 5
- **Callbacks**: `useCallback` prevents function recreation across renders
- **Draft saves**: Debounced at 600ms to avoid excessive writes

---

## 15. Design Tokens & Layout Rules

This section controls **visual presentation only**. It must not change financial logic, wizard behavior, validation, data flow, calculations, routes, or application functionality.

### Spacing

Use a strict 4px-based spacing system:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 48px;
  --space-10: 64px;
}
```

Recommended usage:

- Label → input: 8px
- Input → helper/error: 6–8px
- Field → field: 20–24px
- Card internal gap: 12–16px
- Card padding: 20–24px
- Section → section: 40–48px
- Major page sections: 48–64px

### Border Radius

```css
:root {
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;
}
```

Usage:

- Inputs: 8–10px
- Buttons: 8–10px
- Cards: 12–16px
- Modals / drawers: 16px
- Chips only: pill radius

**Never exceed 24px for standard application surfaces.**

### Borders

```css
:root {
  --border-width: 1px;
  --border-default-style: solid;
}
```

Prefer subtle borders over shadows for standard financial UI containers.

### Shadows

```css
:root {
  --shadow-xs: 0 1px 2px rgba(6, 43, 81, 0.03);
  --shadow-sm: 0 2px 8px rgba(6, 43, 81, 0.05);
  --shadow-md: 0 8px 24px rgba(6, 43, 81, 0.08);
  --shadow-lg: 0 16px 40px rgba(6, 43, 81, 0.12);
}
```

Use:

- `shadow-xs` or no shadow for standard cards
- `shadow-sm` for sticky local navigation / elevated controls
- `shadow-md` for dropdowns and popovers
- `shadow-lg` for modals only

Avoid decorative shadows.

### Control Sizes

```css
:root {
  --control-sm: 36px;
  --control-md: 44px;
  --control-lg: 48px;
}
```

Recommended:

- Standard text input: 44–48px
- Select: 44–48px
- Primary / secondary button: 44–48px
- Icon button: minimum 40px desktop / 44px touch
- Textarea: minimum 96px

### Button Tokens

```css
:root {
  --button-primary-bg: var(--brand-navy-900);
  --button-primary-text: #FFFFFF;
  --button-primary-hover: var(--brand-navy-800);

  --button-secondary-bg: #FFFFFF;
  --button-secondary-text: var(--brand-navy-900);
  --button-secondary-border: var(--border-default);

  --button-danger-bg: var(--danger);
  --button-danger-text: #FFFFFF;
}
```

Primary buttons should be navy, not green. Green is reserved for success states and positive financial signals.

### Form Tokens

```css
:root {
  --input-bg: var(--bg-secondary);
  --input-text: var(--text-primary);
  --input-placeholder: var(--text-subtle);
  --input-border: var(--border-default);
  --input-border-hover: var(--border-strong);
  --input-border-focus: var(--brand-navy-700);
  --input-focus-ring: 0 0 0 3px rgba(22, 74, 115, 0.12);
}
```

Rules:

- Always use persistent labels.
- Do not rely on placeholder-only inputs.
- Numeric financial entry should be the primary input; sliders are optional supporting controls.
- Sliders are appropriate for assumptions such as age, inflation, expected return, lifestyle creep, or tenure.
- Derived values must visually differ from editable values.

### Card Tokens

```css
:root {
  --card-bg: var(--bg-secondary);
  --card-border: var(--border-default);
  --card-radius: var(--radius-lg);
  --card-padding: 24px;
}
```

Rules:

- Avoid card-inside-card nesting.
- Use typography and spacing before adding another container.
- Summary/KPI cards may use 20–24px padding.
- Dense editable cards may use 20px padding.

### Financial Data Tokens

```css
:root {
  --value-primary: var(--text-primary);
  --value-positive: var(--success);
  --value-negative: var(--danger);
  --value-target: var(--brand-gold-600);
  --value-muted: var(--text-secondary);
}
```

Financial values:

- Use tabular numerals.
- Right-align numeric table columns.
- Use Indian number formatting (`₹8.5 L`, `₹1.86 Cr`) for scanability.
- Avoid unnecessary decimal precision.
- Never use green merely because a value is money.

### Chart Tokens

```css
:root {
  --chart-primary: #164A73;
  --chart-secondary: #6F93AB;
  --chart-target: #C9A14A;
  --chart-positive: #21875A;
  --chart-negative: #C94B4B;
  --chart-grid: #E8EEF2;
  --chart-axis: #7D8B96;
  --chart-surface: #FFFFFF;
}
```

Chart rules:

- Primary projection: navy.
- FI target / milestone: gold.
- Positive/on-track indicator: green.
- Deficit/depletion: red.
- Gridlines must be subtle.
- Avoid neon colors and gradient-heavy area fills.
- Avoid more than 4–5 competing visual series.
- Red should not dominate the screen unless an actual critical condition exists.

### Wizard Progress Tokens

```css
:root {
  --wizard-complete: var(--brand-navy-700);
  --wizard-active: var(--brand-navy-900);
  --wizard-upcoming: #C9D3DA;
  --wizard-track: #E5EBEF;
}
```

Layout rules:

- Center the wizard progress under the header.
- Desktop max-width: **760–820px**.
- Do not stretch the progress indicator across the full viewport.
- Active step must have the strongest contrast.
- Completed steps may use a checkmark or filled state.
- Upcoming steps should remain visually quiet.

### Navigation Tokens

```css
:root {
  --nav-active-bg: var(--brand-navy-100);
  --nav-active-text: var(--brand-navy-900);
  --nav-hover-bg: var(--brand-navy-050);
  --nav-text: var(--text-secondary);
}
```

Avoid large filled pills and unnecessary icon decoration.

### Layout

- Desktop page max-width: **1280–1440px**
- 12-column desktop grid
- 8-column tablet grid
- 4-column mobile grid
- Desktop page padding: **32–48px**
- Tablet page padding: **24–32px**
- Mobile page padding: **16–20px**

Form / step widths:

- Simple onboarding steps: **680–820px**
- Complex income / investment steps: **880–1040px**
- Review / projection step: **up to 1280px**

Do not force every wizard step into the same narrow width.

### Review Layout

For the final Goals & Review step, prefer a balanced desktop grid:

```text
Primary review / inputs: 42%
Projection / analysis:   58%
```

The full projection chart should receive more visual space than supporting controls.

On smaller screens, collapse to one column in information-priority order.

### Sticky Wizard Navigation

`WizardNav` may remain sticky, but visually it should behave as a local form action bar:

- Align with the current step content width.
- Use a subtle top border or soft elevation.
- Keep Back visually secondary.
- Keep Continue / See Results primary.
- Avoid floating buttons detached from the form.

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 767px) {}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {}

/* Desktop */
@media (min-width: 1024px) {}

/* Large Desktop */
@media (min-width: 1440px) {}
```

### Motion

```css
:root {
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 220ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

Keep existing wizard transitions within the 150–220ms visual range.

Avoid:

- Zoom transitions
- Bounce effects
- Continuous decorative animation
- Excessive number count-up effects

### Accessibility

- WCAG 2.2 AA contrast target.
- Minimum 4.5:1 for body text.
- Minimum 44px touch target on mobile.
- Never communicate status using color alone.
- Preserve visible keyboard focus.
- Charts require textual interpretation or accessible summaries.

### Anti-Patterns

- No glassmorphism, neon effects, or strong gradients.
- No trading-dashboard aesthetics.
- No cards nested inside cards.
- No decorative 3D icons.
- No repeated “AI-powered” badges.
- No green primary buttons.
- No oversized 24–32px card radii.
- No heavy shadows.
- No dense black-on-black panel stacking.
- No full-width form inputs on large desktop layouts.
- No hidden or hard-to-find Next / Continue actions.
- No gold used as a large background color.
- No red/green ticker-style visual language.
- No decorative chart effects that reduce financial readability.

### Visual Quality Principle

> **The interface should feel like a premium financial-planning product from AM Capitals: calm, precise, trustworthy, and easy to understand.**

Every visual element should improve financial clarity, hierarchy, or usability. If an element is purely decorative and competes with the financial information, remove it.

---

## 16. Environment Variables

```bash
# Auth
NEXTAUTH_SECRET=<random>
NEXTAUTH_URL=<https://yourdomain.com>
GOOGLE_CLIENT_ID=<from Google Cloud>
GOOGLE_CLIENT_SECRET=<from Google Cloud>

# Database
NEXT_PUBLIC_SUPABASE_URL=<https://xxx.supabase.co>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public>
SUPABASE_SERVICE_ROLE_KEY=<private>

# Feature flags
NEXT_PUBLIC_DEMO_AUTH=false
```

---

## 17. Scripts

```bash
npm run dev              # Development server
npm run build            # Production build
npm run lint             # ESLint
npm test                 # All tests
npm run check            # test + check:profiles + check:fields
npm run check:profiles   # Profile roundtrip validation
npm run check:fields     # Client field coverage audit
```

---

## 18. Known Limitations

- **INR only** — no multi-currency support
- **Deterministic returns** — no Monte Carlo or market risk modeling
- **Fixed inflation** — same rate for all expense categories
- **Single household** — no couple or family-wide projections
- **No portfolio rebalancing** — assumes fixed allocation across instruments
- **NPS annuity** — entire corpus treated as available (overstates spendable NW)
- **No tax-loss harvesting** — exit tax not optimized

---

## 19. Extending the System

### Adding a New Investment Instrument

1. Add entry to `BUCKET_DEFS` in `lib/finance/assumptions.mjs`
2. Add default contribution in `lib/profile/schema.mjs`
3. Add UI via `ContributionBlock` in the investments step
4. `buildContributionPlan` will automatically aggregate it

### Adding a Validation Rule

1. Add finding generator in `lib/profile/validate.mjs`
2. Return `{ path, message, severity }`
3. `<FieldError>` components display it automatically by matching `path`

### Adding a Wizard Step

1. Create `StepFoo.jsx` in `components/wizard/steps/`
2. Register in `WizardShell.jsx` step array
3. Update `WizardProgress` step count

---

## 20. Glossary

| Term | Meaning |
|------|---------|
| XIRR | Expected internal rate of return (portfolio blended annual return) |
| SIP | Systematic Investment Plan (recurring monthly investment) |
| FI | Financial Independence (corpus reaches target) |
| NW | Net worth (assets minus liabilities) |
| EMI | Equated monthly installment (loan payment) |
| PPF | Public Provident Fund (govt scheme, 1.5L/yr cap, 15-year lock) |
| EPF | Employee Provident Fund (employer + employee match, retirement) |
| NPS | National Pension System (market-linked, age 60 lock) |
| LTCG | Long-term capital gains tax |
| Corpus | Total accumulated investment amount |
| Blended Return | Weighted average return across all investment buckets |
