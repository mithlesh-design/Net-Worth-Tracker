/* ═══════════════════════════════════════════════════════════════════════════
   RESUME AFTER SIGN-IN

   Signing in leaves the planner: Google sends the browser away and back, and
   an email link opens in a new tab. Whatever was in memory is gone either way,
   so before the planner sends someone to sign in it writes the plan and where
   they were going (the results, or the step they were on) here, and on the
   way back it reads it once and deletes it.

   localStorage rather than sessionStorage, because the email link opens a new
   tab, and a tab cannot read another tab's sessionStorage. It holds the same
   figures the local draft already does, for an hour at most, and is removed
   as soon as it is used or found stale. Reached only from a URL carrying
   ?resume=1, so it never jumps an ordinary visit to a step.

   Every access is wrapped: storage throws outright in some browsers, and the
   cost of that must be "start again", never a crash.
   ═══════════════════════════════════════════════════════════════════════════ */

const KEY = "nwp-resume-v1";
export const RESUME_MAX_AGE_MS = 60 * 60 * 1000;
export const RESUME_PARAM = "resume";

const local = () => {
  try { return globalThis.localStorage ?? null; } catch { return null; }
};

export function saveResume({ plan, step }, storage = local(), now = Date.now()) {
  try {
    storage.setItem(KEY, JSON.stringify({ v: 1, plan, step, at: now }));
    return true;
  } catch {
    return false;
  }
}

/* The saved { plan, step } — once: it is removed as it is read. Null when
   there is none, it is older than RESUME_MAX_AGE_MS, or it is unreadable. */
export function takeResume(storage = local(), now = Date.now()) {
  let raw = null;
  try {
    raw = storage.getItem(KEY);
    storage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    const fresh = Number.isFinite(r?.at) && now - r.at >= 0 && now - r.at <= RESUME_MAX_AGE_MS;
    if (!fresh || !r.plan || typeof r.plan !== "object" || typeof r.step !== "string") return null;
    return { plan: r.plan, step: r.step };
  } catch {
    return null;
  }
}

/* Where the sign-in flow sends someone back to: the planner, told to resume. */
export const RESUME_URL = `/?${RESUME_PARAM}=1`;
