"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { AUTH_ENABLED } from "@/lib/featureFlags.mjs";

/* With authentication paused (lib/featureFlags.mjs) NextAuth is not mounted
   at all, so it never asks /api/auth/session — which errors while auth is
   unconfigured — and useAppSession reports a signed-out user instead. */
export default function SessionProvider({ children }) {
  if (!AUTH_ENABLED) return children;
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
