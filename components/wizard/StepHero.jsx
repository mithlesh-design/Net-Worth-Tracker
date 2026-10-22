"use client";

/* The page's left column: a serif headline, a short gold rule and a quiet
   subtitle. Sticky beside the cards on wide screens, so it stays in view
   while a long step scrolls; stacked above them, smaller, on narrow ones. */
export default function StepHero({ hero }) {
  if (!hero) return null;
  return (
    <header className="lg:sticky lg:top-32 lg:self-start lg:pt-2">
      <h1
        className="font-serif font-bold leading-[1.06] tracking-[-0.01em] text-[2.125rem] sm:text-[2.5rem] lg:text-[2.875rem] xl:text-[3.5rem]"
        style={{ color: "var(--hero-title)" }}
      >
        {hero.title}
      </h1>
      <div aria-hidden className="mt-5 h-[3px] w-14 rounded-full lg:mt-7" style={{ background: "var(--gold-rule)" }} />
      <p
        className="mt-4 max-w-[22rem] text-base leading-relaxed sm:text-lg lg:mt-6"
        style={{ color: "var(--hero-subtitle)" }}
      >
        {hero.subtitle}
      </p>
    </header>
  );
}
