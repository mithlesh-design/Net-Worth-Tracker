import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeDemoUser, makeDemoSession, readDemoSession, writeDemoSession,
  clearDemoSession, DEMO_SESSION_KEY, DEFAULT_DEMO_EMAIL,
} from "./session.mjs";

/* A stand-in for sessionStorage. `fail` makes it behave like a browser that
   blocks site data, which is the case the UI has to report honestly. */
const memStore = (fail = false) => ({
  data: {},
  getItem(k) { if (fail) throw new Error("blocked"); return this.data[k] ?? null; },
  setItem(k, v) { if (fail) throw new Error("blocked"); this.data[k] = v; },
  removeItem(k) { if (fail) throw new Error("blocked"); delete this.data[k]; },
});

test("an entered email becomes the demo display identity", () => {
  const user = makeDemoUser("priya.sharma@example.com");
  assert.equal(user.email, "priya.sharma@example.com");
  assert.equal(user.name, "Priya Sharma");
});

test("an empty email falls back to a default identity", () => {
  for (const empty of ["", "   ", null, undefined]) {
    const user = makeDemoUser(empty);
    assert.equal(user.email, DEFAULT_DEMO_EMAIL);
    assert.equal(user.name, "Demo User");
  }
});

test("the demo session is shaped like a NextAuth session", () => {
  const session = makeDemoSession("a@b.com");
  assert.equal(session.demo, true);
  assert.equal(typeof session.expires, "string");
  assert.equal(session.user.id, "demo-user");
});

test("a written session is read back across a refresh", () => {
  const s = memStore();
  assert.equal(writeDemoSession(makeDemoSession("a@b.com"), s), true);
  assert.equal(readDemoSession(s).user.email, "a@b.com");
});

test("sign out leaves no session behind", () => {
  const s = memStore();
  writeDemoSession(makeDemoSession("a@b.com"), s);
  clearDemoSession(s);
  assert.equal(readDemoSession(s), null);
});

test("blocked storage reports failure instead of pretending to persist", () => {
  const s = memStore(true);
  assert.equal(writeDemoSession(makeDemoSession("a@b.com"), s), false);
  assert.equal(readDemoSession(s), null);
  assert.doesNotThrow(() => clearDemoSession(s));
});

test("a corrupt or half-written value is treated as signed out", () => {
  const s = memStore();
  for (const junk of ["{", "null", '{"user":{}}', "[]"]) {
    s.data[DEMO_SESSION_KEY] = junk;
    assert.equal(readDemoSession(s), null, junk);
  }
});
