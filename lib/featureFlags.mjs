/* ═══════════════════════════════════════════════════════════════════════════
   AUTHENTICATION — PAUSED FOR THIS DEVELOPMENT PHASE

   Sign-in is switched off until the rest of the planner is finished (client
   decision, 2026-10-26). Nothing is deleted: every auth file stays as it is,
   and this one flag decides whether any of it is reachable.

   While it is off:
     - /auth/* (Sign In, Check your email) redirects to the planner, so a
       bookmark, a restored tab or a NextAuth error redirect can never open on
       the sign-in screen (next.config.js reads the same variable);
     - the header shows no Sign in button or account menu;
     - NextAuth is never asked for a session, and demo login is off too;
     - the planner works fully signed out, and the local draft keeps the
       user's work across a reload.

   TO TURN IT BACK ON: set  NEXT_PUBLIC_AUTH_ENABLED=true  in .env.local (and
   in the hosting environment), then restart the dev server or rebuild. It is
   read at build time, so a deployment needs a new build to pick it up.
   ═══════════════════════════════════════════════════════════════════════════ */

export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
