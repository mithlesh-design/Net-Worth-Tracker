/* ═══════════════════════════════════════════════════════════════════════════
   SIGNED-OUT LOCAL DRAFT

   Keeps the form alive across a refresh while signed out. Deliberately narrow:

   - Written ONLY while signed out. Account data belongs in Supabase, where each
     API route filters on session.user.id.
   - Cleared on sign-in and on sign-out, so one person's figures can never
     surface in another person's session on a shared browser.
   - Every access is wrapped: localStorage throws outright in some contexts
     (private windows, browsers set to block site data), and a planner that
     crashes because it could not save a draft would be worse than no draft.
   ═══════════════════════════════════════════════════════════════════════════ */

const KEY = "nwp-draft-v1";

export function readDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeDraft(plan) {
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do; the draft is a convenience, not a source of truth */
  }
}
