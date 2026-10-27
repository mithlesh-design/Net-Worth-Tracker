"use client";

import { SessionProvider as NextAuthSessionProvider, SessionContext } from "next-auth/react";

/* NextAuth runs only when a real sign-in method is configured (`real`, from
   lib/authStatus.mjs). Otherwise it is never asked for a session — which
   would only error while auth is unconfigured — and every useSession() reads
   a fixed "signed out" instead. Demo sessions come from DemoAuthProvider,
   not from here. */
const SIGNED_OUT = { data: null, status: "unauthenticated", update: async () => null };

export default function SessionProvider({ real = false, children }) {
  if (!real) return <SessionContext.Provider value={SIGNED_OUT}>{children}</SessionContext.Provider>;
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
