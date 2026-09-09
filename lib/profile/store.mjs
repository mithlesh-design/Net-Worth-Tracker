/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE STORE — the one place demo and real storage diverge

   The planner calls list / create / update / remove and never learns which
   backend answered. Without this seam the demo branch would have to be
   repeated at every call site, which is exactly how a temporary mode stops
   being removable.

     real  → /api/profiles, which requires a real NextAuth session and reaches
             Supabase with the service-role key
     demo  → localStorage under its own key, no network at all

   Both return the same shape:

     list()                 → { ok, profiles, message }
     create({name,settings})→ { ok, profile, message }
     update(id, {...})      → { ok, profile, message }
     remove(id)             → { ok, message }

   `message` is what the user is shown on failure, so a failure can never be
   rendered as a success.
   ═══════════════════════════════════════════════════════════════════════════ */

import { DEMO_AUTH_ENABLED } from "../demo/config.mjs";
import { listDemoProfiles, saveDemoProfile, deleteDemoProfile } from "../demo/profiles.mjs";

const UNREACHABLE = "Could not reach the server. Please try again.";

async function call(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, data: await res.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0 };
  }
}

const failure = (status, verb) =>
  status === 0 ? UNREACHABLE : `Could not ${verb} (${status}). Please try again.`;

/* ── Real: unchanged behaviour, moved behind the seam ───────────────────── */
const realStore = {
  isDemo: false,
  /* A saved profile lives on the server, so the local draft is redundant. */
  clearsDraftOnSave: true,

  async list() {
    const r = await call("/api/profiles");
    return r.ok
      ? { ok: true, profiles: Array.isArray(r.data) ? r.data : [], message: "" }
      : { ok: false, profiles: [], message: failure(r.status, "load profiles") };
  },

  async create({ name, settings }) {
    const r = await call("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, settings }),
    });
    return r.ok
      ? { ok: true, profile: r.data, message: "Profile saved." }
      : { ok: false, message: failure(r.status, "save") };
  },

  async update(id, { name, settings }) {
    const r = await call(`/api/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, settings }),
    });
    return r.ok
      ? { ok: true, profile: r.data, message: "Profile updated." }
      : { ok: false, message: failure(r.status, "save") };
  },

  async remove(id) {
    const r = await call(`/api/profiles/${id}`, { method: "DELETE" });
    return r.ok ? { ok: true, message: "" } : { ok: false, message: failure(r.status, "delete") };
  },
};

/* ── Demo: same contract, browser storage, no network ───────────────────── */
const demoStore = {
  isDemo: true,
  /* The draft IS the demo user's working state; clearing it on save would
     empty the form on the next refresh. */
  clearsDraftOnSave: false,

  async list() {
    const r = listDemoProfiles();
    return { ok: r.ok, profiles: r.profiles, message: r.message };
  },

  async create({ name, settings }) {
    const r = saveDemoProfile({ name, settings });
    return r.ok
      ? { ok: true, profile: r.profile, message: "Profile saved on this browser." }
      : { ok: false, message: r.message };
  },

  async update(id, { name, settings }) {
    const r = saveDemoProfile({ id, name, settings });
    return r.ok
      ? { ok: true, profile: r.profile, message: "Profile updated on this browser." }
      : { ok: false, message: r.message };
  },

  async remove(id) {
    const r = deleteDemoProfile(id);
    return { ok: r.ok, message: r.message };
  },
};

/* The demo store is reachable only when the build-time flag allows it AND the
   caller actually holds a demo session, so a real signed-in user never lands
   in browser storage by accident. */
export function getProfileStore(isDemoSession) {
  return DEMO_AUTH_ENABLED && isDemoSession ? demoStore : realStore;
}
