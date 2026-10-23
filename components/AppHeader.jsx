"use client";

import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import logo from "@/components/Img/amc-logo.svg";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* The brand bar every screen shares: deep navy, the gold logo, the theme pill
   and whatever the page puts on the right (the account button). The logo is
   drawn in gold for a dark ground, so the bar stays navy in both themes.

   The account button is always the LAST thing on the bar, after the theme
   pill. At 320px the logo steps down a size so logo, pill and a labelled
   "Sign in" still fit on one line. */
export default function AppHeader({ children = null }) {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1520px] items-center justify-between gap-3 px-4 sm:h-20 sm:px-8">
        <Link href="/" className="min-w-0 shrink rounded-md py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          <img src={logo.src} alt="Avdesh Mishra Capitals" className="h-8 w-auto max-w-full min-[375px]:h-9 sm:h-11 lg:h-[52px]" />
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemePill />
          {children}
        </div>
      </div>
    </header>
  );
}

/* Two explicit choices rather than one toggle, as in the brand reference: the
   filled half is the theme in use. */
function ThemePill() {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: "light", Icon: Sun, label: "Light theme" },
    { id: "dark", Icon: Moon, label: "Dark theme" },
  ];
  return (
    <div role="group" aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-full border p-1"
      style={{ borderColor: "rgba(255, 255, 255, 0.55)" }}>
      {options.map(({ id, Icon, label }) => {
        const on = theme === id;
        return (
          <button key={id} type="button" onClick={() => setTheme(id)}
            aria-label={label} aria-pressed={on}
            className={cn(
              /* 36px discs, 40×48 to the touch: the ::after reaches into
                 the pill's padding and the bar's height. */
              "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150",
              "after:absolute after:-inset-x-0.5 after:-inset-y-1.5 after:content-['']",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
              on ? "shadow-sm" : "hover:bg-white/10"
            )}
            style={on
              ? { background: "linear-gradient(180deg, #EACD84, #C9A14A)", color: "#0A2342" }
              : { color: "var(--header-text)" }}>
            <Icon size={ICON_SIZE.md} />
          </button>
        );
      })}
    </div>
  );
}
