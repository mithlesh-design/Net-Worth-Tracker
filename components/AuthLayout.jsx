"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import PageBackground from "@/components/PageBackground";
import StepHero from "@/components/wizard/StepHero";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* The sign-in pages in the planner's own frame: the same header, photograph
   and headline column, with the form in a card where the step content would
   be. Nothing here knows about authentication. */
export default function AuthLayout({ hero, children }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <PageBackground />
      <AppHeader />
      <main className="relative z-[1] mx-auto w-full max-w-[1520px] flex-1 px-4 py-8 sm:px-8 lg:py-14">
        <div className="grid gap-7 lg:grid-cols-[clamp(240px,22vw,340px)_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          <StepHero hero={hero} />
          <div className="w-full max-w-[540px] space-y-4">
            <Link href="/"
              className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              style={{ color: "var(--text-secondary)" }}>
              <ArrowLeft size={ICON_SIZE.sm} /> Back to planner
            </Link>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
