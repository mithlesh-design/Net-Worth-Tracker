/* ═══════════════════════════════════════════════════════════════════════════
   TEMPORARY DEMO AUTH — THE ONLY SWITCH

   A preview-only sign-in that fakes a session in the browser so the whole
   logged-in experience can be shown before the client supplies Google, SMTP
   and Supabase credentials. Two deliberate switches:

     NEXT_PUBLIC_DEMO_AUTH=true        development only (.env.local): a
                                       production build ignores it, so a
                                       stray "true" in a hosting dashboard
                                       cannot open the bypass.
     NEXT_PUBLIC_DEMO_AUTH_LIVE=true   also on the live site (set by the
                                       committed .env.production), to show
                                       the client the flow before real sign-in
                                       exists. Steps aside by itself once a
                                       real method is configured: real
                                       credentials always win.

   A separate name for the live switch on purpose: a hosting dashboard value
   overrides a committed .env file, and the dashboard already carries
   NEXT_PUBLIC_DEMO_AUTH from earlier previews. Anything but the exact string
   "true" is off. lib/authStatus.mjs calls demoAllowed with whether a
   real method exists, and the result reaches the browser through
   AuthConfigProvider, so the demo provider, the sign-in page and the profile
   store all follow the one decision.

   TO REMOVE THIS MODE ENTIRELY: delete lib/demo/ and .env.production, delete
   the DemoAuthProvider from app/layout.jsx, and point the import sites
   (app/page.jsx, app/auth/signin/page.jsx, components/AuthButton.jsx,
   lib/profile/store.mjs) back at next-auth's useSession/signOut and the real
   fetch store.

   Note what this is NOT: no server route trusts it. The demo session lives
   only in the browser, and app/api/profiles/* still requires a real NextAuth
   session, so a client-minted demo identity cannot read or write real data.
   On the live site it is a preview of the flow, not a lock: anyone can pass.
   ═══════════════════════════════════════════════════════════════════════════ */

export function demoAllowed(env = process.env, { real = false } = {}) {
  if (env.NEXT_PUBLIC_DEMO_AUTH_LIVE === "true") return !real;
  return env.NEXT_PUBLIC_DEMO_AUTH === "true" && env.NODE_ENV !== "production";
}
