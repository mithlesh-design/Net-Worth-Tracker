"use client";

/* A heading for a group of cards inside a step ("Protection", "Your
   investment data"). DM Serif Display, a size down from the step headline
   and well above the Manrope card titles. Flush with the card edges below it. `note` is a quiet aside
   on the right that wraps under the title on a phone. */
export default function GroupHeading({ title, note = null }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2">
      <h2 className="text-heading text-[var(--hero-title)]">{title}</h2>
      {note && <span className="text-help text-[var(--text-muted)]">{note}</span>}
    </div>
  );
}
