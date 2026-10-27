import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAllowed } from "./config.mjs";

const dev = { NODE_ENV: "development" };
const prod = { NODE_ENV: "production" };

test("the flag is off unless it is explicitly set", () => {
  assert.equal(demoAllowed({ ...dev, NEXT_PUBLIC_DEMO_AUTH: "" }), false);
  assert.equal(demoAllowed({ ...prod }), false);
});

test("only the exact strings true and live enable it", () => {
  for (const value of ["1", "yes", "TRUE", "true ", "LIVE", "on"]) {
    assert.equal(demoAllowed({ ...dev, NEXT_PUBLIC_DEMO_AUTH: value }), false, value);
  }
  assert.equal(demoAllowed({ ...dev, NEXT_PUBLIC_DEMO_AUTH: "true" }), true);
});

test("true is development only: a production build cannot activate it", () => {
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH: "true" }), false);
});

test("live also works on the live site, as a deliberate preview", () => {
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH: "live" }), true);
});

test("live steps aside once real sign-in is configured", () => {
  assert.equal(demoAllowed({ ...prod, NEXT_PUBLIC_DEMO_AUTH: "live" }, { real: true }), false);
});
