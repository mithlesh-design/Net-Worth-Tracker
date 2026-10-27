"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   DEMO AUTH PROVIDER — the one place demo and real sessions are chosen

   `useAppSession()` is what the header, user menu and planner call. It returns
   the NextAuth session unchanged unless a demo session is active, so removing
   demo mode is a matter of swapping that one import back to next-auth's
   useSession — not unpicking conditionals from every component.

   Restoring is done in an effect, never during render: sessionStorage does not
   exist on the server, and reading it while rendering is the classic source of
   a hydration mismatch. The first paint therefore shows the same "loading"
   state the server produced, and the effect settles it on the next tick — it
   cannot stick, because the effect runs unconditionally on mount.
   ═══════════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { DEMO_AUTH_ENABLED } from "@/lib/demo/config.mjs";
import {
  makeDemoSession, readDemoSession, writeDemoSession, clearDemoSession,
} from "@/lib/demo/session.mjs";

const DemoAuthContext = createContext({
  enabled: false,
  ready: true,
  session: null,
  persisted: true,
  signIn: () => false,
  signOut: () => {},
});

export function DemoAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  /* Nothing to restore when the mode is off, so no loading state is entered. */
  const [ready, setReady] = useState(!DEMO_AUTH_ENABLED);
  /* False only when the browser refused to store the session, so the menu can
     say a refresh will not hold rather than implying it will. */
  const [persisted, setPersisted] = useState(true);

  useEffect(() => {
    if (!DEMO_AUTH_ENABLED) return;
    setSession(readDemoSession());
    setReady(true);
  }, []);

  const signIn = useCallback((email) => {
    if (!DEMO_AUTH_ENABLED) return false;
    const next = makeDemoSession(email);
    const stored = writeDemoSession(next);
    setSession(next);
    setPersisted(stored);
    setReady(true);
    return true;
  }, []);

  const signOut = useCallback(() => {
    clearDemoSession();
    setSession(null);
    setPersisted(true);
  }, []);

  const value = useMemo(
    () => ({ enabled: DEMO_AUTH_ENABLED, ready, session, persisted, signIn, signOut }),
    [ready, session, persisted, signIn, signOut]);

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>;
}

/* For the sign-in page, which needs to start a demo session. */
export function useDemoAuth() {
  return useContext(DemoAuthContext);
}

/* The session every other component reads. `isDemo` exists so the planner can
   pick the matching profile store and the menu can label itself honestly;
   nothing else needs to know. */
export function useAppSession() {
  const nextAuth = useSession();
  const demo = useDemoAuth();

  return useMemo(() => {
    if (demo.enabled) {
      if (!demo.ready) {
        return { data: null, status: "loading", isDemo: false, persisted: true, signOut: demo.signOut };
      }
      if (demo.session) {
        return {
          data: demo.session,
          status: "authenticated",
          isDemo: true,
          persisted: demo.persisted,
          signOut: demo.signOut,
        };
      }
    }
    /* No demo session: the real flow, untouched. */
    return {
      data: nextAuth.data ?? null,
      status: nextAuth.status,
      isDemo: false,
      persisted: true,
      signOut: () => nextAuthSignOut(),
    };
  }, [demo, nextAuth.data, nextAuth.status]);
}
