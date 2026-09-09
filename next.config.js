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

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
