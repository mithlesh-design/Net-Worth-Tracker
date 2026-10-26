/* ═══════════════════════════════════════════════════════════════════════════
   An EMPTY NEXTAUTH_URL is worse than an absent one.

   next-auth v4 reads it at module import time and hands it to parseUrl, whose
   fallback is `new URL(url ?? default)`. `??` only catches null and undefined,
   so an empty string sails through to `new URL("")` and throws

     TypeError: Invalid URL  { input: '' }

   at import time — which fails EVERY prerendered page and so the whole build,
   with a stack trace that names no file of ours. A blank value is easy to
   create by accident in a hosting dashboard (add the key, save without a
   value), so treat blank as absent here and let next-auth fall back to
   VERCEL_URL, or to localhost in development.
   ═══════════════════════════════════════════════════════════════════════════ */
for (const key of ["NEXTAUTH_URL", "NEXTAUTH_URL_INTERNAL"]) {
  if (typeof process.env[key] === "string" && process.env[key].trim() === "") {
    delete process.env[key];
  }
}

/* Authentication is paused (see lib/featureFlags.mjs, which reads the same
   variable). While it is, every /auth/* page goes to the planner, as a
   temporary (307) redirect so no browser remembers it once sign-in returns. */
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    if (AUTH_ENABLED) return [];
    return [{ source: "/auth/:path*", destination: "/", permanent: false }];
  },
};

module.exports = nextConfig;
