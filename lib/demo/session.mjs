/* ═══════════════════════════════════════════════════════════════════════════
   DEMO SESSION — sessionStorage only

   Shapes a fake NextAuth session so every consumer (header, user menu,
   planner) can read `session.user` without knowing whether it is real.

   sessionStorage, not localStorage, on purpose: the demo identity should die
   with the browser tab. It survives a refresh — which is what makes the
   preview usable — but not a new tab or a restart, so nobody is left silently
   "logged in" as a demo user days later.

   Every access is wrapped. sessionStorage throws outright in some contexts
   (private windows, browsers set to block site data) and a preview that
   crashes because it could not remember a fake login would be worse than one
   that simply signs out.

   `storage` is injectable so this module can be unit tested under node.
   ═══════════════════════════════════════════════════════════════════════════ */

export const DEMO_SESSION_KEY = "nwp-demo-session-v1";

/* Used when the email box is left empty, so the button works in one click. */
export const DEFAULT_DEMO_EMAIL = "demo@networth.local";
export const DEMO_USER_ID = "demo-user";

function storageOf(explicit) {
  if (explicit) return explicit;
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null; /* blocked by the browser */
  }
}

/* "priya.sharma@x.com" → "Priya Sharma". Display only; never sent anywhere. */
function nameFromEmail(email) {
  const local = String(email).split("@")[0] ?? "";
  const words = local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.length ? words.join(" ") : "Demo User";
}

export function makeDemoUser(email) {
  const typed = typeof email === "string" ? email.trim() : "";
  const address = typed || DEFAULT_DEMO_EMAIL;
  return {
    id: DEMO_USER_ID,
    email: address,
    name: typed ? nameFromEmail(address) : "Demo User",
    image: null,
  };
}

/* `demo: true` is the marker every consumer checks; `expires` exists only so
   the object is shaped like the NextAuth session it stands in for. */
export function makeDemoSession(email) {
  return {
    user: makeDemoUser(email),
    demo: true,
    expires: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

export function readDemoSession(storage) {
  const s = storageOf(storage);
  if (!s) return null;
  try {
    const raw = s.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    /* A half-written or hand-edited value is treated as no session rather
       than handed to the UI as a user with no email. */
    if (!parsed?.user?.email) return null;
    return { ...parsed, demo: true };
  } catch {
    return null;
  }
}

/* Returns whether the session was actually persisted, so the UI can say so
   instead of promising a refresh will hold. */
export function writeDemoSession(session, storage) {
  const s = storageOf(storage);
  if (!s) return false;
  try {
    s.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearDemoSession(storage) {
  const s = storageOf(storage);
  if (!s) return;
  try {
    s.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* nothing to do; the caller has already dropped it from React state */
  }
}
