"use client";

import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import logo from "@/components/Img/amc-logo.svg";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* The brand bar every screen shares: deep navy, the gold logo, the theme pill
   and whatever the page puts on the right (the account button). The logo is
   drawn in gold for a dark ground, so the bar stays navy in both themes. */
export default function AppHeader({ children = null }) {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1520px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-8">
        <Link href="/" className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
          <img src={logo.src} alt="Avdesh Mishra Capitals" className="h-9 w-auto sm:h-11 lg:h-[52px]" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {children}
          <ThemePill />
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
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 sm:h-9 sm:w-9",
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
