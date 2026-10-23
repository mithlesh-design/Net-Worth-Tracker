"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";

const WORDS = ["Plan", "Invest", "Grow", "Be Free"];
const UNDERLINED = "Grow";

/* The brand line from the reference, decorative: it is not navigation and
   reads as one phrase to a screen reader. */
export default function BrandTagline({ className = "" }) {
  return (
    <p className={cn("flex items-center gap-3 text-overline uppercase tracking-[0.2em]", className)}
      style={{ color: "var(--text-primary)" }}>
      {WORDS.map((w, i) => (
        <Fragment key={w}>
          {i > 0 && <span aria-hidden style={{ color: "var(--text-subtle)" }}>|</span>}
          <span className="relative whitespace-nowrap">
            {w}
            {w === UNDERLINED && (
              <span aria-hidden className="absolute -bottom-2.5 left-0 right-0 h-[2px] rounded-full"
                style={{ background: "var(--gold-rule)" }} />
            )}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
