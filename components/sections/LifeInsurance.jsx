"use client";

import {
  CollapsibleSection, SliderInput, SegmentedControl, InfoStrip, DerivedStat, FieldError,
} from "@/components/ui";
import { fmt } from "@/lib/finance/format.mjs";

/* Client field 24. The intake sheet asks for one "Life Insurance value", which
   is ambiguous: a sum assured is a death benefit, a surrender value is money
   you could actually take today. The selector makes the user say which, because
   only one of them belongs in net worth. */
export default function LifeInsurance({ plan, setField, findingsFor }) {
  const li = plan.lifeInsurance;
  const isCover = li.valueType === "sumAssured";
  const countedAsset = isCover ? (li.surrenderValue ?? 0) : li.value;

  return (
    <CollapsibleSection title="Life Insurance" defaultOpen={false}
      badge={li.value > 0 ? fmt(li.value) : "None"}>

      <SliderInput
        label="Life Insurance value (₹)"
        value={li.value}
        onChange={(v) => setField("lifeInsurance.value", v)}
        min={0} max={100000000} step={100000} prefix="₹" showWords
      />

      <SegmentedControl
        label="This figure is"
        options={[
          { value: "sumAssured", label: "Sum assured (cover)" },
          { value: "surrenderValue", label: "Surrender / cash value" },
        ]}
        value={li.valueType}
        onChange={(v) => setField("lifeInsurance.valueType", v)}
      />

      {isCover && (
        <div className="border-t pt-3" style={{ borderColor: 'var(--border-secondary)' }}>
          <SliderInput
            label="Current surrender / cash value (₹)"
            value={li.surrenderValue ?? 0}
            onChange={(v) => setField("lifeInsurance.surrenderValue", v)}
            min={0} max={50000000} step={10000} prefix="₹" showWords
          />
          <p className="text-[0.55rem] mt-1" style={{ color: 'var(--text-muted)' }}>
            Optional. Leave at zero if you do not know it. Nothing is inferred from
            the cover amount.
          </p>
        </div>
      )}

      <DerivedStat
        label="Counted in net worth"
        value={fmt(countedAsset)}
        sub={countedAsset > 0 ? "cash value only" : "a death benefit is not wealth"}
      />

      <InfoStrip tone="blue">
        A sum assured is paid to your nominee on death. It is protection, not wealth,
        so it is never added to your net worth. Only a current surrender or cash value
        counts as an asset.
      </InfoStrip>

      <InfoStrip tone="amber">
        Enter your premium once, under LIC Insurance Premiums in Monthly Investments.
      </InfoStrip>

      <FieldError findings={findingsFor("lifeInsurance")} />
    </CollapsibleSection>
  );
}
