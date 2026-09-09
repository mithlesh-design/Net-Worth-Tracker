"use client";

/* The `rounded-lg border px-3 py-2 text-[0.6rem]` strip repeated six times in
   app/page.jsx, extracted with its markup unchanged. `tone` picks the existing
   --info-{tone}-bg/border/text token triad. */
export default function InfoStrip({ tone = "blue", children, icon = null, className = "" }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-[0.6rem] ${icon ? "flex items-start gap-1.5" : ""} ${className}`}
      style={{
        background: `var(--info-${tone}-bg)`,
        borderColor: `var(--info-${tone}-border)`,
        color: `var(--info-${tone}-text)`,
      }}>
      {icon}
      <div className={icon ? "flex-1" : ""}>{children}</div>
    </div>
  );
}
