"use client";

import { Briefcase } from "lucide-react";
import {
  CollapsibleSection, SliderInput, InfoStrip, DerivedStat, FieldError, Button,
} from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";
import { BUCKET_DEFS, LOCKED } from "@/lib/finance/assumptions.mjs";
import { HOLDING_BUCKET } from "@/lib/profile/schema.mjs";

/* Client fields 17-23, plus the legacy unallocated aggregate.
   Everything here is a value TODAY, never a maturity or projected value. */
const FIELDS = [
  { key: "mf",     label: "Current Value of Mutual Funds (₹)" },
  { key: "fd",     label: "Current Value of FD (₹)" },
  { key: "rd",     label: "Current Value of RD (₹)", hint: "Balance today, not the maturity value." },
  { key: "ppf",    label: "Current Value of PPF (₹)" },
  { key: "nps",    label: "Current Value of NPS (₹)" },
  { key: "epf",    label: "Current Value of EPF (₹)", hint: "Passbook total, including the employer share." },
  { key: "stocks", label: "Current Value of Stocks (₹)" },
  { key: "crypto", label: "Current value of Crypto (₹)" },
];

const NAMED = FIELDS.map((f) => f.key);

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


  const liquid = Object.entries(h).reduce((s, [k, v]) => {
    const b = HOLDING_BUCKET[k];
    return BUCKET_DEFS[b]?.tier === LOCKED ? s : s + (Number(v) || 0);
  }, 0);
  const locked = totalHoldings - liquid;

  /* A migrated profile's aggregate net worth already contains these holdings.
     The engine cannot double count it, but the UI can invite the user to, so
     offer the correction explicitly and never adjust it silently. */
  const needsReconciliation = unallocated > 0 && namedTotal > 0;

  const reduceUnallocated = () =>
    setField(`${basePath}.unallocated`, Math.max(0, unallocated - namedTotal));

  return (
    <CollapsibleSection title={title} icon={Briefcase} defaultOpen={false}
      badge={totalHoldings > 0 ? fmt(totalHoldings) : null}>

      {FIELDS.map((f) => (
        <div key={f.key}>
          <SliderInput
            label={f.label}
            value={h[f.key] ?? 0}
            onChange={(v) => setField(`${basePath}.${f.key}`, v)}
            min={0} max={50000000} step={10000} prefix="₹" showWords
            warn={findingsFor(`${basePath}.${f.key}`).length > 0}
          />
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {f.hint ?? "Value today."}
          </p>
        </div>
      ))}

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
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
            <div className="flex gap-2 pt-0.5">
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
          sub={`${fmt(liquid)} available · ${fmt(locked)} in retirement accounts`}
        />
        {/* The opening portfolio can carry things this card does not list —
            owned property, for one — so say so rather than leaving it larger
            than this total for no visible reason. Life insurance adds nothing
            here: a policy is counted when it pays out. */}
        {showStartingPortfolioNote && startingPortfolio != null && startingPortfolio !== totalHoldings && (
          <DerivedStat label="Starting Portfolio" value={fmt(startingPortfolio)}
            sub="includes assets entered elsewhere" />
        )}
      </div>

      {showStartingPortfolioNote && (
        <InfoStrip tone="blue">
          This total is your starting portfolio. PPF, EPF and NPS are tracked separately
          because they cannot fund goals before they unlock.
        </InfoStrip>
      )}

      <FieldError findings={findingsFor(basePath)} />
    </CollapsibleSection>
  );
}
