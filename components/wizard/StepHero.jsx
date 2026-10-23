"use client";

/* The page's left column: the step headline, a short gold rule and a quiet
   subtitle. Sticky beside the cards on wide screens, so it stays in view
   while a long step scrolls; stacked above them, smaller, on narrow ones.
   The headline is bold, upright and navy throughout; the gold is the rule. */
export default function StepHero({ hero }) {
  if (!hero) return null;
  return (
    <header className="lg:sticky lg:top-32 lg:self-start">
      {/* The negative margin trims the line box so the capitals, not the
          leading, line up with the top of the first card. */}
      <h1 className="text-display text-[var(--hero-title)] lg:-mt-1.5">
        {hero.title}
      </h1>
      <div aria-hidden className="mt-5 h-[3px] w-14 rounded-full lg:mt-6" style={{ background: "var(--gold-rule)" }} />
      <p className="mt-4 max-w-[22rem] text-lead text-[var(--hero-subtitle)] lg:mt-5">
        {hero.subtitle}
      </p>
    </header>
  );
}
