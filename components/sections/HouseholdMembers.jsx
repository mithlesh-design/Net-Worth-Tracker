"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import IncomeSources from "@/components/sections/IncomeSources";
import {
  CollapsibleSection, SliderInput, SegmentedControl, TextField, FieldError, InfoStrip,
  PersonAvatar, Button, Collapsible, CollapsibleTrigger, CollapsibleContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui";
import { fmt, toAnnual } from "@/lib/finance/format.mjs";
import {
  RELATIONSHIPS, RELATIONSHIP_ORDER, MAX_MEMBERS,
  personLabel, personPlan, personAge,
} from "@/lib/household/members.mjs";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

const NAME_PLACEHOLDER = {
  spouse: "e.g. Priya", parent: "e.g. Father", child: "e.g. Aarav",
  sibling: "e.g. Rohan", other: "e.g. Aunt Meena",
};

const monthlyIncome = (incomes) =>
  (incomes ?? []).reduce((s, i) => s + toAnnual(Number(i.amount) || 0, i.frequency) / 12, 0);

/* Everyone whose money is part of the plan, added once, here. The Strategy Hub
   builds a tab for each of them and Review lists them for the household total;
   neither has an "add" of its own. */
export default function HouseholdMembers({
  plan, scopeFor, addMember, removeMember, makeId,
}) {
  const members = plan.members ?? [];
  const atLimit = members.length >= MAX_MEMBERS;
  /* A member just added opens so it can be filled in; the rest stay compact. */
  const [justAdded, setJustAdded] = useState(null);

  const add = (relationship) => setJustAdded(addMember(relationship));

  return (
    <CollapsibleSection
      title="Household Members"
      badge={members.length ? `${members.length} added` : null}
      defaultOpen
    >
      <p className="text-xs text-[var(--text-muted)]">
        Spouse, partner, parents or anyone whose money is part of your plan. Each
        person gets their own tab in the Strategy Hub, and on Review you choose
        who counts in the household totals.
      </p>

      {members.map((m) => (
        <MemberCard
          key={m.id}
          plan={plan}
          member={m}
          scope={scopeFor(m.id)}
          makeId={makeId}
          onRemove={() => removeMember(m.id)}
          defaultOpen={m.id === justAdded}
        />
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={atLimit}>
          <Button
            variant="outline"
            className="w-full border-dashed py-3 h-auto text-xs font-semibold border-[var(--border-strong)] text-[var(--text-secondary)] bg-transparent hover:bg-[var(--surface-hover)]"
          >
            <Plus size={ICON_SIZE.sm} className="mr-1.5" />
            Add a household member
            <ChevronDown size={ICON_SIZE.sm} className="ml-1.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          {RELATIONSHIP_ORDER.map((r) => (
            <DropdownMenuItem key={r} onSelect={() => add(r)}>
              {RELATIONSHIPS[r].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {atLimit && (
        <p className="text-xs text-center text-[var(--text-muted)]">
          Up to {MAX_MEMBERS} members, so each still gets a usable tab.
        </p>
      )}
    </CollapsibleSection>
  );
}

function MemberCard({ plan, member: m, scope, makeId, onRemove, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const [confirming, setConfirming] = useState(false);

  const label = personLabel(plan, m.id);
  const relation = RELATIONSHIPS[m.relationship] ?? RELATIONSHIPS.other;
  const age = personAge(plan, m.id);
  const incomes = m.incomes ?? [];
  const perMonth = monthlyIncome(incomes);

  const setAge = (v) => {
    scope.setField("currentAge", v);
    /* Moving the slider is the confirmation the migration asked for. */
    if (m.ageAssumed) scope.setField("ageAssumed", false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <PersonAvatar label={label} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{label}</span>
            <span className="block truncate text-xs text-[var(--text-muted)]">
              {relation.short} · {age ?? "–"} yrs · {perMonth > 0 ? `${fmt(perMonth)}/mo` : "no income"}
              {m.included === false && " · not in household total"}
            </span>
          </span>
          <ChevronDown size={ICON_SIZE.sm}
            className={cn("shrink-0 text-[var(--text-muted)] transition-transform duration-200", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 border-t border-[var(--border-subtle)] px-4 pb-4 pt-4">
          <SegmentedControl
            label="Relationship"
            options={RELATIONSHIP_ORDER.map((r) => ({ value: r, label: r === "other" ? "Other" : RELATIONSHIPS[r].short }))}
            value={m.relationship}
            onChange={(v) => scope.setField("relationship", v)}
          />
          <TextField
            label="Name (optional)"
            value={m.personal?.fullName ?? ""}
            onChange={(v) => scope.setField("personal.fullName", v)}
            placeholder={NAME_PLACEHOLDER[m.relationship] ?? NAME_PLACEHOLDER.other}
          />
          <div>
            <SliderInput label="Age" value={age ?? 0} onChange={setAge}
              min={0} max={100} suffix=" yrs"
              warn={scope.findingsFor("currentAge").some((f) => f.severity === "error")} />
            <FieldError findings={scope.findingsFor("currentAge")} />
          </div>
          <div>
            <SliderInput label="Retirement age" value={m.retirementAge ?? 60}
              onChange={(v) => scope.setField("retirementAge", v)}
              min={18} max={80} suffix=" yrs" />
            <p className="text-[0.6rem] mt-0.5 text-[var(--text-muted)]">
              {age !== null && m.retirementAge <= age
                ? "Already retired: their investments no longer take new money, and their returns are held to their post-retirement rate."
                : "Their monthly investments stop at this age, and their returns switch to their post-retirement rate."}
            </p>
          </div>

          <IncomeSources
            plan={personPlan(plan, m.id)}
            incomes={incomes}
            updateIncome={(id, key, val) => scope.updateListItem("incomes", id, key, val)}
            addIncome={(inc) => scope.setField("incomes", [...incomes, { ...inc, id: makeId() }])}
            removeIncome={(id) => scope.setField("incomes", incomes.filter((i) => i.id !== id))}
            findingsFor={scope.findingsFor}
            totalMonthlyIncome={perMonth}
            title={`${label}'s income`}
            pathPrefix="incomes"
            /* A parent or child may have no income at all. */
            minItems={0}
            showHint={false}
            defaultOpen
          />
          {incomes.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              No income recorded. Their holdings and investments can still be added on their Strategy Hub tab.
            </p>
          )}

          {confirming ? (
            <div className="space-y-2 rounded-lg border border-[var(--border-subtle)] p-3">
              <InfoStrip tone="red">
                Removing {label} also deletes their holdings, investments and
                property from the plan.
              </InfoStrip>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" className="flex-1 text-xs" onClick={onRemove}>
                  Remove {label}
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setConfirming(false)}>
                  Keep
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs text-[var(--text-muted)]"
              onClick={() => setConfirming(true)}>
              <Trash2 size={ICON_SIZE.sm} className="mr-1.5" /> Remove {label}
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
