"use client";

import { createContext, useContext } from "react";

/* What this deployment's sign-in can do, worked out on the server from its
   environment (lib/authStatus.mjs) and handed down from the root layout:

     enabled   anyone can sign in at all — shows Log in, gates the results
     real      a real provider is configured (otherwise only demo login)
     demo      the development-only demo login is on
     methods   { google, email }: which buttons the sign-in page offers

   Booleans only; no credential ever reaches the browser. */
const OFF = { enabled: false, real: false, demo: false, methods: { google: false, email: false } };
const AuthConfigContext = createContext(OFF);

export function AuthConfigProvider({ value, children }) {
  return <AuthConfigContext.Provider value={value ?? OFF}>{children}</AuthConfigContext.Provider>;
}

export function useAuthConfig() {
  return useContext(AuthConfigContext);
}
