import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAllowed } from "./config.mjs";

const dev = { NODE_ENV: "development" };
const prod = { NODE_ENV: "production" };

test("the flag is off unless it is explicitly set", () => {
  assert.equal(demoAllowed({ ...dev, NEXT_PUBLIC_DEMO_AUTH: "" }), false);
  assert.equal(demoAllowed({ ...prod }), false);
});

test("only the exact string true enables it", () => {
  for (const value of ["1", "yes", "TRUE", "true ", "live", "on"]) {
    assert.equal(demoAllowed({ ...dev, NEXT_PUBLIC_DEMO_AUTH: value }), false, value);
  }
  assert.equal(demoAllowed({ ...dev, NEXT_PUBLIC_DEMO_AUTH: "true" }), true);
});

test("true is development only: a production build cannot activate it", () => {
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH: "true" }), false);
});

test("the live switch also works on the live site, as a deliberate preview", () => {
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH_LIVE: "true" }), true);
  /* Whatever the dashboard still says for the development flag. */
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH: "true", NEXT_PUBLIC_DEMO_AUTH_LIVE: "true" }), true);
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH: "false", NEXT_PUBLIC_DEMO_AUTH_LIVE: "true" }), true);
});

test("the live switch steps aside once real sign-in is configured", () => {
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH_LIVE: "true" }, { real: true }), false);
});
