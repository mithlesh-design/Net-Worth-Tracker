import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/* The flag folds at import time, so each combination needs its own process. */
const url = fileURLToPath(new URL("./config.mjs", import.meta.url));
const enabledWith = (env) =>
  execFileSync(process.execPath,
    ["-e", `import(${JSON.stringify(url)}).then(m => process.stdout.write(String(m.DEMO_AUTH_ENABLED)))`],
    { env: { ...process.env, ...env }, encoding: "utf8" }).trim();

test("the flag is off unless it is explicitly set", () => {
  assert.equal(enabledWith({ NEXT_PUBLIC_DEMO_AUTH: "", NODE_ENV: "development" }), "false");
});

test("only the exact string true enables it", () => {
  for (const value of ["1", "yes", "TRUE", "true "]) {
    assert.equal(enabledWith({ NEXT_PUBLIC_DEMO_AUTH: value, NODE_ENV: "development" }), "false", value);
  }
  assert.equal(enabledWith({ NEXT_PUBLIC_DEMO_AUTH: "true", NODE_ENV: "development" }), "true");
});

test("production cannot activate the bypass even with the flag set", () => {
  assert.equal(enabledWith({ NEXT_PUBLIC_DEMO_AUTH: "true", NODE_ENV: "production" }), "false");
});
