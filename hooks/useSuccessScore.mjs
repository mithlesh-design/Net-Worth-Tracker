"use client";

import { useDeferredValue, useMemo } from "react";
import { computeSuccessScore } from "@/lib/finance/successscore.mjs";
import { clampPlan } from "@/lib/profile/validate.mjs";

/* The Monte Carlo costs roughly 40-60ms per call, and SliderInput is a native
   range input firing onChange on every pointermove. A plain useMemo([plan])
   would therefore run it on every move event and block the main thread.

   Two mitigations, in order of how much they buy:

   1. `enabled` — the score is only shown on one step, so it only runs there.
      Every other step and the server render cost nothing. This is the big one
      and it is free.
   2. useDeferredValue — React abandons intermediate plan values during a drag
      and computes once for the latest. setField structuredClones, so the
      reference comparison always fires correctly.

   Be honest about what this does NOT do: it reduces how OFTEN the work runs,
   not how long it blocks when it does. `stale` is returned so the UI can show
   that it is catching up rather than looking frozen. */
export function useSuccessScore(plan, { enabled = true, runs } = {}) {
  const deferred = useDeferredValue(plan);

  const score = useMemo(
    () => (enabled ? computeSuccessScore(clampPlan(deferred), runs ? { runs } : {}) : null),
    [enabled, deferred, runs]
  );

  return { score, stale: enabled && deferred !== plan };
}

export default useSuccessScore;
