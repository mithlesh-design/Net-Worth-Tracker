"use client";

import { ChartNoAxesColumn } from "lucide-react";
import { SliderInput, DerivedStat, FieldError, SectionCard } from "@/components/ui";

export default function Timeline({ plan, setField, findingsFor, age, ageIsDerived, currentAge, setCurrentAge, lifeExpectancy, setLifeExpectancy }) {
  return (
    <SectionCard title="Your Financial Timeline" icon={ChartNoAxesColumn} kicker="Key milestones ahead">
      <div className="space-y-6">
        {(Number(age) > 0 || Number(plan.retirementAge) > 0 || Number(lifeExpectancy) > 0) && (
          <MilestoneTrack today={age} retirement={plan.retirementAge} lifeExpectancy={lifeExpectancy} />
        )}
        {ageIsDerived ? (
          <>
            <DerivedStat label="Current Age" value={`${age} yrs`} sub="from your date of birth" />
            <button onClick={() => setField("personal.dob", null)}
              className="text-help underline underline-offset-2" style={{ color: 'var(--text-muted)' }}>
              Clear date of birth to set age manually
            </button>
          </>
        ) : (
          <SliderInput label="Current Age" value={currentAge} onChange={setCurrentAge} min={0} max={65} suffix=" yrs" />
        )}
        <SliderInput label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} min={0} max={100} suffix=" yrs" />
        <SliderInput label="Retirement Age" value={plan.retirementAge}
          onChange={(v) => setField("retirementAge", v)} min={0} max={80} suffix=" yrs" />
        <FieldError findings={[...findingsFor("currentAge"), ...findingsFor("lifeExpectancy"), ...findingsFor("retirementAge")]} />
      </div>
    </SectionCard>
  );
}

/* Today, retirement and life expectancy on one line, so the three sliders
   below read as one span of life rather than three numbers. Read-only: it
   draws the values the sliders hold. The line is placed between the first
   and last milestone, so it fills from today to retirement in navy. */
function MilestoneTrack({ today, retirement, lifeExpectancy }) {
  const lo = Number(today) || 0;
  const life = Number(lifeExpectancy) || 0;
  const hi = Math.max(lo, Number(retirement) || 0, life, 1);
  const at = (v) => `${Math.min(Math.max(((v - lo) / (hi - lo)) * 100, 0), 100)}%`;
  const points = [
    { label: "Today", value: lo, pos: "0%" },
    { label: "Retirement", value: retirement, pos: at(retirement) },
    { label: "Life Expectancy", value: life, pos: at(life) },
  ].filter((point) => Number(point.value) > 0);
  const retirementPos = points.find((point) => point.label === "Retirement")?.pos ?? "0%";

  return (
    <div className="px-2 pt-1 sm:px-6" role="img"
      aria-label={`Today ${lo} years, retirement at ${retirement}, life expectancy ${life}`}>
      <div className="relative h-14">
        {points.map((p) => (
          <div key={p.label}
            className="absolute top-0 flex flex-col items-center whitespace-nowrap"
            style={{
              left: p.pos,
              transform: p.label === "Today" ? "translateX(-12%)" : p.label === "Life Expectancy" ? "translateX(-88%)" : "translateX(-50%)",
            }}>
            <span className="text-overline uppercase" style={{ color: "var(--text-secondary)" }}>{p.label}</span>
            <span className="mt-1 text-value tabular-nums" style={{ color: "var(--text-primary)" }}>
              {p.value} <span className="text-label" style={{ color: "var(--text-muted)" }}>yrs</span>
            </span>
          </div>
        ))}
      </div>
      <div className="relative mt-2 h-4">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: "var(--slider-track-bg)" }} />
        <div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
          style={{ width: retirementPos, background: "var(--slider-fill)" }} />
        {points.map((p) => (
          <span key={p.label} className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: p.pos, background: "var(--gold-rule)", boxShadow: "0 0 0 3px var(--card-bg)" }} />
        ))}
      </div>
    </div>
  );
}
