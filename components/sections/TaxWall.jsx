"use client";

import { Landmark } from "lucide-react";
import { CollapsibleSection, SliderInput, InfoStrip } from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

export default function TaxWall({ plan, setField, defaultOpen }) {
  const { exitTaxRate } = plan;
  return (
    <CollapsibleSection title="Tax Wall (LTCG)" icon={Landmark} defaultOpen={defaultOpen !== undefined ? defaultOpen : false}>
      <SliderInput label="Effective Exit Tax" value={exitTaxRate} onChange={(v) => setField("exitTaxRate", v)} min={0} max={30} step={0.5} suffix="%" />
      {/* An explanation of the arithmetic, not a problem: the note tone. */}
      <InfoStrip tone="amber">
        Goal withdrawals are grossed up: amount / (1 &minus; {exitTaxRate}%).
        A &#8377;10 L goal costs <strong>{fmt(1000000 / (1 - exitTaxRate / 100))}</strong> from your portfolio.
      </InfoStrip>
    </CollapsibleSection>
  );
}
