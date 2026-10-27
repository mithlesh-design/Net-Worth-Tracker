import { test } from "node:test";
import assert from "node:assert/strict";
import { authStatus, authMethods } from "./authStatus.mjs";

const SECRET = { NEXTAUTH_SECRET: "s" };
const GOOGLE = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "cs" };
const SUPABASE = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };
const EMAIL = { EMAIL_SERVER_HOST: "smtp.resend.com", EMAIL_FROM: "plans@example.com" };

test("with nothing configured, sign-in is off and nothing is gated", () => {
  assert.deepEqual(authStatus({}), {
    enabled: false, real: false, demo: false, methods: { google: false, email: false },
  });
});

test("Google needs the secret as well as its client id and secret", () => {
  assert.equal(authMethods({ ...GOOGLE }).google, false);
  assert.equal(authMethods({ ...SECRET, ...GOOGLE }).google, true);
});

test("the email link needs Supabase, which keeps its one-time tokens", () => {
  assert.equal(authMethods({ ...SECRET, ...EMAIL }).email, false);
  assert.equal(authMethods({ ...SECRET, ...EMAIL, ...SUPABASE }).email, true);
});

test("a blank value counts as missing, as a hosting dashboard can leave one", () => {
  assert.equal(authMethods({ ...SECRET, GOOGLE_CLIENT_ID: "  ", GOOGLE_CLIENT_SECRET: "cs" }).google, false);
});

test("any one real method turns sign-in on", () => {
  const s = authStatus({ ...SECRET, ...GOOGLE });
  assert.equal(s.enabled, true);
  assert.equal(s.real, true);
});

test("demo login: the dev flag is development only, the live switch also works live", () => {
  assert.equal(authStatus({ NEXT_PUBLIC_DEMO_AUTH: "true", NODE_ENV: "development" }).enabled, true);
  assert.equal(authStatus({ NEXT_PUBLIC_DEMO_AUTH: "true", NODE_ENV: "production" }).enabled, false);
  const live = authStatus({ NEXT_PUBLIC_DEMO_AUTH_LIVE: "true", NODE_ENV: "production" });
  assert.equal(live.enabled, true);
  assert.equal(live.demo, true);
});

test("on the live site, real credentials replace the demo login by themselves", () => {
  const s = authStatus({ NEXT_PUBLIC_DEMO_AUTH_LIVE: "true", NODE_ENV: "production", ...SECRET, ...GOOGLE });
  assert.equal(s.demo, false);
  assert.equal(s.real, true);
});

test("the status the browser receives carries no credential values", () => {
  const s = JSON.stringify(authStatus({ ...SECRET, ...GOOGLE, ...SUPABASE, ...EMAIL }));
  for (const v of ["id", "cs", "https://x.supabase.co", "smtp.resend.com", "plans@example.com"]) {
    assert.ok(!s.includes(`"${v}"`), `${v} leaked into the status`);
  }
});
