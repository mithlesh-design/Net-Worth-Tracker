/* ═══════════════════════════════════════════════════════════════════════════
   SIGN-IN STATUS — what this deployment can actually offer

   Sign-in switches itself on when the environment holds what it needs, and
   stays off (no Log in button, no gate on See Results, /auth/* redirects to
   the planner) until then. Nothing to flip by hand: adding the credentials
   to .env.local, or to Vercel and redeploying, is what turns it on.

     Google      NEXTAUTH_SECRET + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
     Email link  NEXTAUTH_SECRET + EMAIL_SERVER_HOST + EMAIL_FROM, and Supabase
                 (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY), which
                 keeps the one-time sign-in tokens
     Demo        NEXT_PUBLIC_DEMO_AUTH=true in development only (lib/demo)

   Reads only whether a value is present, never the value, so the result is
   safe to hand to the browser. Read at build time on Vercel (the layout and
   next.config.mjs are built once), so a new credential needs a redeploy.
   docs/AUTH-SETUP.md walks through getting each one.
   ═══════════════════════════════════════════════════════════════════════════ */

const present = (env, ...keys) => keys.every((k) => String(env[k] ?? "").trim() !== "");

export function authMethods(env = process.env) {
  const secret = present(env, "NEXTAUTH_SECRET");
  const supabase = present(env, "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  return {
    google: secret && present(env, "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
    email: secret && supabase && present(env, "EMAIL_SERVER_HOST", "EMAIL_FROM"),
    /* Accounts are stored (and profiles can be saved) only with Supabase. */
    supabase,
  };
}

/* The same rule as lib/demo/config.mjs, read from `env` so it can be tested. */
const demoOn = (env) => env.NEXT_PUBLIC_DEMO_AUTH === "true" && env.NODE_ENV !== "production";

/* { enabled, real, demo, methods }: `real` when a real provider is
   configured; `enabled` when anyone can sign in at all, real or demo — which
   is what shows the Log in button and gates the results. */
export function authStatus(env = process.env) {
  const methods = authMethods(env);
  const real = methods.google || methods.email;
  const demo = demoOn(env);
  return { enabled: real || demo, real, demo, methods: { google: methods.google, email: methods.email } };
}
