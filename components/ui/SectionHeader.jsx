"use client";

import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* The one place a section icon gets colour. Card headers carry a gold icon in
   a soft-gold circle — the brand's section marker. Icons inside content stay
   currentColor, and colour there still only ever means a state. */
export function SectionIcon({ icon: Icon }) {
  return (
    <span aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11"
      style={{ background: "var(--gold-soft)", color: "var(--gold-icon)" }}>
      <Icon size={ICON_SIZE.lg} />
    </span>
  );
}

/* Every card header in the product:

     (icon)  Section title  ─────────────────────  KICKER  [action]

   The title is sentence case, navy, `text-title` (Manrope Bold — the
   heading face is kept for the large headings); the gold is in the icon
   disc, the hairline and the small uppercase kicker.

   `kicker` is a quiet right-hand note (a count, an amount, a short phrase);
   `action` is a control such as a collapsible's chevron. `titleAs` lets a
   header sit inside a button, where a heading element is not allowed.

   On a phone there is no room for title, rule and kicker on one line, so the
   rule goes and the kicker wraps under the title, aligned with it; it moves
   to the right edge only from sm, where it shares the title's line. */
export default function SectionHeader({
  icon = null, title, kicker = null, action = null, titleAs: Title = "h3", className = "",
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3 sm:gap-4", className)}>
      {icon && <SectionIcon icon={icon} />}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-0.5">
        <Title className="text-title text-[var(--text-primary)]">{title}</Title>
        <span aria-hidden className="hidden h-px min-w-4 flex-1 sm:block" style={{ background: "var(--gold-line)" }} />
        {kicker && (
          <span className="text-overline uppercase tabular-nums text-[var(--gold-text)] sm:ml-auto">
            {kicker}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
