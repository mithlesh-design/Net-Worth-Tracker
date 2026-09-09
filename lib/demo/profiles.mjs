/* ═══════════════════════════════════════════════════════════════════════════
   DEMO PROFILE STORAGE — localStorage, its own namespace

   Stands in for the Supabase `profiles` table while the backend is not wired
   up. Three separations matter:

     - its own key, so demo profiles never mix with the signed-out working
       draft ("nwp-draft-v1", lib/profile/draft.mjs)
     - localStorage rather than the sessionStorage the demo login uses, so a
       saved profile outlives the tab the way a real saved profile would
     - nothing here ever reaches Supabase; the real API routes still demand a
       real NextAuth session

   Rows are shaped like the Supabase rows the UI already renders — id, name,
   settings, created_at, updated_at — so components need no demo-specific
   branch to list them.

   Every function returns { ok, message }. A quota error or a browser that
   blocks site data must surface as a failure: the previous silent-catch
   version of the real save path made a failed save look exactly like a
   successful one, and with 38 fields to re-enter that is a real data hazard.
   ═══════════════════════════════════════════════════════════════════════════ */

export const DEMO_PROFILES_KEY = "nwp-demo-profiles-v1";

const BLOCKED = "This browser is blocking local storage, so demo profiles cannot be used.";
const UNREADABLE = "Existing demo profiles could not be read, so nothing was changed.";

function storageOf(explicit) {
  if (explicit) return explicit;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function newId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    /* fall through to the timestamp id */
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* Reads the array, or reports why it could not. A stored value that is not an
   array of profiles is an error rather than an empty list: overwriting it
   would destroy whatever is actually there. */
function readAll(s) {
  let raw;
  try {
    raw = s.getItem(DEMO_PROFILES_KEY);
  } catch {
    return { ok: false, message: BLOCKED };
  }
  if (!raw) return { ok: true, profiles: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false, message: UNREADABLE };
    return { ok: true, profiles: parsed.filter((p) => p && typeof p.id === "string") };
  } catch {
    return { ok: false, message: UNREADABLE };
  }
}

function writeAll(s, profiles) {
  try {
    s.setItem(DEMO_PROFILES_KEY, JSON.stringify(profiles));
    return { ok: true };
  } catch {
    /* Almost always the 5 MB quota, occasionally a blocked store. */
    return { ok: false, message: "This browser refused to store the profile (storage full or blocked)." };
  }
}

export function listDemoProfiles(storage) {
  const s = storageOf(storage);
  if (!s) return { ok: false, profiles: [], message: BLOCKED };
  const read = readAll(s);
  if (!read.ok) return { ok: false, profiles: [], message: read.message };
  /* Newest first, matching the API route's .order("updated_at", desc). */
  const profiles = [...read.profiles].sort(
    (a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
  return { ok: true, profiles, message: "" };
}

/* Create when `id` is null, update in place when it names an existing row —
   the same rule the real store applies with POST versus PUT. */
export function saveDemoProfile({ id = null, name, settings }, storage) {
  const s = storageOf(storage);
  if (!s) return { ok: false, message: BLOCKED };
  if (!name || !settings) return { ok: false, message: "Name and settings required." };

  const read = readAll(s);
  if (!read.ok) return { ok: false, message: read.message };

  const now = new Date().toISOString();
  const profiles = read.profiles;
  const index = id ? profiles.findIndex((p) => p.id === id) : -1;

  let profile;
  if (index >= 0) {
    profile = { ...profiles[index], name, settings, updated_at: now };
    profiles[index] = profile;
  } else {
    profile = { id: newId(), name, settings, created_at: now, updated_at: now };
    profiles.push(profile);
  }

  const written = writeAll(s, profiles);
  if (!written.ok) return { ok: false, message: written.message };
  return { ok: true, profile, created: index < 0, message: "" };
}

export function deleteDemoProfile(id, storage) {
  const s = storageOf(storage);
  if (!s) return { ok: false, message: BLOCKED };
  const read = readAll(s);
  if (!read.ok) return { ok: false, message: read.message };

  const remaining = read.profiles.filter((p) => p.id !== id);
  if (remaining.length === read.profiles.length) {
    return { ok: false, message: "That demo profile no longer exists." };
  }
  const written = writeAll(s, remaining);
  if (!written.ok) return { ok: false, message: written.message };
  return { ok: true, message: "" };
}

/* Used by sign-out only if the caller wants a clean slate; the demo login
   itself leaves saved profiles alone, exactly as a real sign-out would. */
export function clearDemoProfiles(storage) {
  const s = storageOf(storage);
  if (!s) return;
  try {
    s.removeItem(DEMO_PROFILES_KEY);
  } catch {
    /* nothing to do */
  }
}
