"use client";

import { CollapsibleSection, SliderInput } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

export default function TaxWall({ plan, setField, defaultOpen }) {
  const { exitTaxRate } = plan;
  return (
    <CollapsibleSection title="Tax Wall (LTCG)" defaultOpen={defaultOpen !== undefined ? defaultOpen : false}>
      <SliderInput label="Effective Exit Tax" value={exitTaxRate} onChange={(v) => setField("exitTaxRate", v)} min={0} max={30} step={0.5} suffix="%" />
      <div className="rounded-lg border px-3 py-2 text-[0.6rem] space-y-1"
        style={{ background: 'var(--info-rose-bg)', borderColor: 'var(--info-rose-border)', color: 'var(--info-rose-text)' }}>
        <div>Goal withdrawals grossed-up: Amount / (1-{exitTaxRate}%).</div>
        <div>₹10L goal costs <strong>{fmt(1000000 / (1 - exitTaxRate / 100))}</strong> from portfolio.</div>
      </div>
    </CollapsibleSection>
  );
}
