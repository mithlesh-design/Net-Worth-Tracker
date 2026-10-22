"use client";

/* A heading for a group of cards inside a step ("Protection", "Your
   investment data"). Serif like the page headline, a size down, so the
   hierarchy reads hero → group → gold card eyebrow. `note` is a quiet aside
   on the right that wraps under the title on a phone. */
export default function GroupHeading({ title, note = null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 pt-2">
      <h2 className="font-serif text-xl font-semibold sm:text-2xl" style={{ color: "var(--hero-title)" }}>
        {title}
      </h2>
      {note && <span className="text-sm" style={{ color: "var(--text-muted)" }}>{note}</span>}
    </div>
  );
}
