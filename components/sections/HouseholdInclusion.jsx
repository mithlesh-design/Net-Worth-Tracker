"use client";

import { useId } from "react";
import { SectionCard, Switch, PersonAvatar } from "@/components/ui";
import { fmt, toAnnual } from "@/lib/finance/format.mjs";
import {
  SELF, people, personLabel, hasMembers, RELATIONSHIPS,
} from "@/lib/household/members.mjs";

const sum = (xs) => xs.reduce((s, v) => s + (Number(v) || 0), 0);

/* Who counts in the household figures. The one control for it: the chart,
   Monthly Summary, the Strategy Hub's Success Score and the goal charts all
   read the household projection, so every one of them follows these switches.

   Kept out of the chart area on purpose — a row of toggles over a chart
   competes with the thing they change. */
export default function HouseholdInclusion({ plan, setField, scopeFor }) {
  const baseId = useId();
  if (!hasMembers(plan)) return null;

  const everyone = people(plan);
  const includedCount = everyone.filter((p) => p.included).length;
  const lastOneOn = includedCount === 1;
  const lockNoteId = `${baseId}-lock`;

  const setIncluded = (id, v) => (id === SELF
    ? setField("household.includeSelf", v)
    : scopeFor(id).setField("included", v));

  return (
    <SectionCard title="Include in Household Calculation">
      <p className="text-xs text-[var(--text-muted)]">
        Whose money counts in the household totals, the projection and the Success Score.
      </p>

      <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
        {everyone.map((p) => {
          const d = p.data;
          const label = p.id === SELF
            ? (String(plan.personal?.fullName ?? "").trim() || "Me")
            : personLabel(plan, p.id);
          const relation = p.id === SELF
            ? "You"
            : (RELATIONSHIPS[p.relationship] ?? RELATIONSHIPS.other).short;
          const perMonth = sum((d.incomes ?? []).map((i) => toAnnual(Number(i.amount) || 0, i.frequency) / 12));
          const held = sum(Object.values(d.holdings ?? {})) + sum((d.properties ?? []).map((pr) => pr?.value));
          /* Switching off the last person would leave the household all costs
             and no money. */
          const locked = p.included && lastOneOn;
          const switchId = `${baseId}-${p.id}`;
          return (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <PersonAvatar label={label} />
              <div className="min-w-0 flex-1">
                <label htmlFor={switchId}
                  className="block truncate text-sm font-semibold text-[var(--text-primary)] cursor-pointer">
                  {label}
                </label>
                <span className="block truncate text-xs text-[var(--text-muted)]">
                  {relation} · {perMonth > 0 ? `${fmt(perMonth)}/mo` : "no income"} · {fmt(held)} held
                </span>
              </div>
              <Switch
                id={switchId}
                checked={p.included}
                disabled={locked}
                onCheckedChange={(v) => setIncluded(p.id, v)}
                aria-describedby={locked ? lockNoteId : undefined}
              />
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Household expenses and goals always count in full · {includedCount} of {everyone.length} people included.
      </p>
      {lastOneOn && (
        <p id={lockNoteId} className="mt-1 text-xs text-[var(--text-subtle)]">
          At least one person has to stay included.
        </p>
      )}
    </SectionCard>
  );
}
