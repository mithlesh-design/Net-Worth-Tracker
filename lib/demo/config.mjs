/* ═══════════════════════════════════════════════════════════════════════════
   TEMPORARY DEMO AUTH — THE ONLY SWITCH

   A preview-only sign-in that fakes a session in the browser so the whole
   logged-in experience can be shown before the client supplies Google, SMTP
   and Supabase credentials. One flag, two deliberate values:

     NEXT_PUBLIC_DEMO_AUTH=true   development only (.env.local): a production
                                  build ignores it, so a stray "true" in a
                                  hosting dashboard cannot open the bypass.
     NEXT_PUBLIC_DEMO_AUTH=live   also on the live site (.env.production), to
                                  show the client the flow before real
                                  sign-in exists. Steps aside by itself once a
                                  real method is configured: real credentials
                                  always win, with no file to remember to edit.

   Any other value is off. lib/authStatus.mjs calls demoAllowed with whether a
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
  const flag = env.NEXT_PUBLIC_DEMO_AUTH;
  if (flag === "live") return !real;
  return flag === "true" && env.NODE_ENV !== "production";
}
