/* ═══════════════════════════════════════════════════════════════════════════
   TEMPORARY DEMO AUTH — THE ONLY SWITCH

   A preview-only sign-in that fakes a session in the browser so the whole
   logged-in experience can be shown before the client supplies Google, SMTP
   and Supabase credentials. It is deliberately confined to this one flag:

     NEXT_PUBLIC_DEMO_AUTH=true   in .env.local

   Two conditions must BOTH hold, and both are compile-time constants:

     1. the flag is the exact string "true"
     2. NODE_ENV is not "production"

   `next build` sets NODE_ENV=production, so the whole expression folds to
   `false` and every demo branch is dead code the bundler drops. A production
   deployment therefore cannot activate the bypass even if the flag is set in
   its environment by mistake.

   TO REMOVE THIS MODE ENTIRELY: delete lib/demo/, delete the DemoAuthProvider
   from app/layout.jsx, and point the four import sites (app/page.jsx,
   app/auth/signin/page.jsx, components/AuthButton.jsx, lib/profile/store.mjs)
   back at next-auth's useSession/signOut and the real fetch store.

   Note what this is NOT: no server route trusts it. The demo session lives
   only in the browser, and app/api/profiles/* still requires a real NextAuth
   session, so a client-minted demo identity cannot read or write real data.
   ═══════════════════════════════════════════════════════════════════════════ */

export const DEMO_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_AUTH === "true" &&
  process.env.NODE_ENV !== "production";
