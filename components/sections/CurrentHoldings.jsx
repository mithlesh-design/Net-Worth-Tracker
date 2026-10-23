"use client";

import { Briefcase } from "lucide-react";
import {
  CollapsibleSection, SliderInput, InfoStrip, DerivedStat, FieldError, Button,
} from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { BUCKET_DEFS, LIQUID, LOCKED, ILLIQUID } from "@/lib/finance/assumptions.mjs";
import { bucketReturn } from "@/lib/finance/projection.mjs";
import { HOLDING_BUCKET } from "@/lib/profile/schema.mjs";

/* Client fields 17-23 and the expanded intake list, in the intake sheet's own
   order, then the legacy unallocated aggregate. Everything here is a value
   TODAY, never a maturity or projected value.

   The real-estate row is not an input. Property is entered once, under
   Property You Own, with its loan and rent; here it is shown as a total, so
   the same flat can never be entered twice. */
const FIELDS = [
  { key: "mf",            label: "Current Value of Equity Mutual Funds (₹)" },
  { key: "debtMf",        label: "Current Value of Debt / Arbitrage Mutual Funds (₹)" },
  { key: "fd",            label: "Current Value of FD (₹)" },
  { key: "rd",            label: "Current Value of RD (₹)", hint: "Balance today, not the maturity value." },
  { key: "nps",           label: "Current Value of NPS (₹)" },
  { key: "ppf",           label: "Current Value of PPF (₹)" },
  { key: "cash",          label: "Current Value of Cash / Savings A/c (₹)" },
  { key: "epf",           label: "Current Value of EPF (₹)", hint: "Passbook total, including the employer share." },
  { key: "ssy",           label: "Current Value of SSY (₹)", hint: "Sukanya Samriddhi balance, locked until the account matures 21 years after opening." },
  { key: "ulip",          label: "Current Value of ULIP (₹)", hint: "Fund value today, from your latest statement." },
  { key: "stocks",        label: "Current Value of Stocks (₹)", hint: "Indian equities in your demat account." },
  { realEstate: true },
  { key: "usStocks",      label: "Current Value of Stocks – US (₹)" },
  { key: "crypto",        label: "Current Value of Crypto (₹)", hint: "Exchanges and cold wallets." },
  { key: "gold",          label: "Current Value of Gold (₹)", hint: "Gold / silver ETFs and Sovereign Gold Bonds." },
  { key: "privateEquity", label: "Current Value of Private Equity (₹)", hint: "Unlisted shares and PE/VC funds. Counted in net worth, never sold to cover a shortfall." },
  { key: "rsu",           label: "Current Value of RSUs (₹)", hint: "Vested shares at today's price. Unvested RSUs are future pay." },
];

const NAMED = FIELDS.filter((f) => f.key).map((f) => f.key);

/* The return the projection grows a holding at, so the figure is never a
   surprise. Read from the engine itself rather than restated here. */
function returnNote(plan, key) {
  const b = HOLDING_BUCKET[key];
  const rate = Number(bucketReturn(plan, b).toFixed(2));
  return `Assumed return ${rate}%/yr${BUCKET_DEFS[b]?.rateIsEstimate ? ", an estimate" : ""}.`;
}

/* Everything here is a value TODAY for one person. A household member's card
   is this same component handed their person-scoped plan and setField, so
   "holdings" always means the holdings of whoever the card is for. */
export default function CurrentHoldings({
  plan, setField, findingsFor, totalHoldings, startingPortfolio,
  basePath = "holdings",
  title = "Current Holdings",
  showStartingPortfolioNote = true,
}) {
  const h = basePath.split(".").reduce((o, k) => o?.[k], plan) ?? {};
  const namedTotal = NAMED.reduce((s, k) => s + (Number(h[k]) || 0), 0);
  const unallocated = Number(h.unallocated) || 0;
  const fdrd = (Number(h.fd) || 0) + (Number(h.rd) || 0);
  const realEstate = (plan.properties ?? []).reduce((s, p) => s + (Number(p?.value) || 0), 0);
  const thisYear = new Date().getFullYear();

  /* Split by the engine's own tiers: what can be spent, what is locked until
     an age or a maturity, and what is owned but never sold. */
  const byTier = Object.entries(h).reduce((t, [k, v]) => {
    const tier = BUCKET_DEFS[HOLDING_BUCKET[k]]?.tier ?? LIQUID;
    t[tier] = (t[tier] ?? 0) + (Number(v) || 0);
    return t;
  }, {});
  const liquid = byTier[LIQUID] ?? 0;
  const locked = byTier[LOCKED] ?? 0;
  const illiquid = byTier[ILLIQUID] ?? 0;

  /* The same money in two places: a ULIP's fund value here and its maturity
     amount on a ULIP policy under Life Insurance. */
  const ulipPolicyPays = (plan.lifePolicies ?? [])
    .some((p) => p?.type === "ulip" && (Number(p.maturityAmount) || 0) > 0);
  const ulipTwice = (Number(h.ulip) || 0) > 0 && ulipPolicyPays;

  /* A migrated profile's aggregate net worth already contains these holdings.
     The engine cannot double count it, but the UI can invite the user to, so
     offer the correction explicitly and never adjust it silently. */
  const needsReconciliation = unallocated > 0 && namedTotal > 0;

  const reduceUnallocated = () =>
    setField(`${basePath}.unallocated`, Math.max(0, unallocated - namedTotal));

  return (
    <CollapsibleSection title={title} icon={Briefcase} defaultOpen={false}
      badge={totalHoldings > 0 ? fmt(totalHoldings) : null}>

      {FIELDS.map((f) => (f.realEstate ? (
        <div key="realEstate" className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-label text-[var(--text-primary)]">Current Value of Real Estate (₹)</span>
            <span className="shrink-0 whitespace-nowrap text-value tabular-nums text-[var(--text-primary)]">{fmt(realEstate)}</span>
          </div>
          <p className="text-help text-[var(--text-muted)]">
            {realEstate > 0
              ? "The total of Property You Own, below. Edit it there, with its loan and rent."
              : "Add a property under Property You Own, below, with its loan and rent."}
          </p>
        </div>
      ) : (
        <div key={f.key}>
          <SliderInput
            label={f.label}
            value={h[f.key] ?? 0}
            onChange={(v) => setField(`${basePath}.${f.key}`, v)}
            min={0} max={50000000} step={10000} prefix="₹" showWords
            warn={findingsFor(`${basePath}.${f.key}`).length > 0}
          />
          <p className="mt-1 text-help" style={{ color: 'var(--text-muted)' }}>
            {f.hint ?? "Value today."} {returnNote(plan, f.key)}
          </p>
          {/* SSY's lock runs from the year it was opened, like PPF's. */}
          {f.key === "ssy" && (Number(h.ssy) || 0) > 0 && (
            <div className="mt-3">
              <SliderInput label="SSY account opened (year)"
                value={plan.ssyOpenedYear ?? thisYear}
                onChange={(v) => setField("ssyOpenedYear", v)}
                min={thisYear - 21} max={thisYear} step={1} grouped={false} />
              <p className="mt-1 text-help" style={{ color: 'var(--text-muted)' }}>
                Matures in {(plan.ssyOpenedYear ?? thisYear) + 21}.
              </p>
            </div>
          )}
          {f.key === "ulip" && ulipTwice && (
            <div className="mt-3">
              <InfoStrip tone="amber">
                A ULIP policy under Life Insurance also has a maturity amount. They are
                the same money, so enter it in one place only, or it is counted twice.
              </InfoStrip>
            </div>
          )}
        </div>
      )))}

      {fdrd > 0 && (
        <DerivedStat label="Combined FD / RD" value={fmt(fdrd)}
          sub="the single figure the intake sheet asks for" />
      )}

      <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
        <SliderInput
          label="Other / unallocated assets (₹)"
          value={unallocated}
          onChange={(v) => setField(`${basePath}.unallocated`, v)}
          min={0} max={50000000} step={10000} prefix="₹" showWords
        />
        <p className="mt-1 text-help" style={{ color: 'var(--text-muted)' }}>
          Anything not broken down above. A previously saved net worth lands here.
        </p>
      </div>

      {needsReconciliation && (
        <InfoStrip tone="amber">
          <div className="space-y-1.5">
            <div>
              Unallocated <strong>{fmt(unallocated)}</strong> plus entered{" "}
              <strong>{fmt(namedTotal)}</strong> = <strong>{fmt(totalHoldings)}</strong> total.
              If the entered holdings are part of the unallocated figure, reduce it.
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <Button size="sm" onClick={reduceUnallocated}>
                Reduce unallocated by {fmt(namedTotal)}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setField(`${basePath}.unallocated`, 0)}>
                Clear it
              </Button>
            </div>
          </div>
        </InfoStrip>
      )}

      <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border-secondary)' }}>
        <DerivedStat
          label="Total Current Holdings"
          value={fmt(totalHoldings)}
          sub={[
            `${fmt(liquid)} available`,
            locked > 0 && `${fmt(locked)} locked`,
            illiquid > 0 && `${fmt(illiquid)} illiquid`,
          ].filter(Boolean).join(" · ")}
        />
        {/* The opening portfolio also carries owned property, entered under
            Property You Own, so say so rather than leaving it larger than this
            total for no visible reason. Life insurance adds nothing here: a
            policy is counted when it pays out. */}
        {showStartingPortfolioNote && startingPortfolio != null && startingPortfolio !== totalHoldings && (
          <DerivedStat label="Starting Portfolio" value={fmt(startingPortfolio)}
            sub={realEstate > 0 ? "includes your real estate" : "includes assets entered elsewhere"} />
        )}
      </div>

      {showStartingPortfolioNote && (
        <InfoStrip tone="blue">
          This total is your starting portfolio. PPF, EPF, NPS and SSY are tracked separately
          because they cannot fund goals before they unlock; private equity and real estate
          count in your net worth but are never sold to cover a shortfall.
        </InfoStrip>
      )}

      <FieldError findings={findingsFor(basePath)} />
    </CollapsibleSection>
  );
}
