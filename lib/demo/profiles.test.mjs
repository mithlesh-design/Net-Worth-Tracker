import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listDemoProfiles, saveDemoProfile, deleteDemoProfile,
  DEMO_PROFILES_KEY,
} from "./profiles.mjs";
import { DEMO_SESSION_KEY } from "./session.mjs";

const memStore = (fail = false) => ({
  data: {},
  getItem(k) { if (fail) throw new Error("blocked"); return this.data[k] ?? null; },
  setItem(k, v) { if (fail) throw new Error("blocked"); this.data[k] = v; },
  removeItem(k) { if (fail) throw new Error("blocked"); delete this.data[k]; },
});

const settings = { schemaVersion: 1, currentAge: 30 };

test("an empty store lists no profiles rather than erroring", () => {
  const r = listDemoProfiles(memStore());
  assert.equal(r.ok, true);
  assert.deepEqual(r.profiles, []);
});

test("a saved profile is listed with the fields the menu renders", () => {
  const s = memStore();
  const saved = saveDemoProfile({ name: "Base case", settings }, s);
  assert.equal(saved.ok, true);
  assert.equal(saved.created, true);

  const [p] = listDemoProfiles(s).profiles;
  assert.equal(p.name, "Base case");
  assert.deepEqual(p.settings, settings);
  assert.equal(typeof p.id, "string");
  assert.equal(Number.isFinite(Date.parse(p.updated_at)), true);
});

test("saving with an id updates in place instead of duplicating", () => {
  const s = memStore();
  const first = saveDemoProfile({ name: "Base case", settings }, s);
  const again = saveDemoProfile(
    { id: first.profile.id, name: "Base case", settings: { ...settings, currentAge: 31 } }, s);

  assert.equal(again.ok, true);
  assert.equal(again.created, false);
  const list = listDemoProfiles(s).profiles;
  assert.equal(list.length, 1);
  assert.equal(list[0].settings.currentAge, 31);
});

test("delete removes only the named profile", () => {
  const s = memStore();
  const a = saveDemoProfile({ name: "A", settings }, s);
  saveDemoProfile({ name: "B", settings }, s);

  assert.equal(deleteDemoProfile(a.profile.id, s).ok, true);
  const names = listDemoProfiles(s).profiles.map((p) => p.name);
  assert.deepEqual(names, ["B"]);
});

test("deleting something that is gone is reported, not silently accepted", () => {
  const r = deleteDemoProfile("nope", memStore());
  assert.equal(r.ok, false);
  assert.match(r.message, /no longer exists/);
});

test("a blocked store reports failure rather than a false success", () => {
  const s = memStore(true);
  const saved = saveDemoProfile({ name: "A", settings }, s);
  assert.equal(saved.ok, false);
  assert.ok(saved.message.length > 0);
  assert.equal(listDemoProfiles(s).ok, false);
  assert.equal(deleteDemoProfile("x", s).ok, false);
});

test("a full store fails the save instead of claiming it worked", () => {
  const s = memStore();
  s.setItem = () => { throw new Error("QuotaExceededError"); };
  const saved = saveDemoProfile({ name: "A", settings }, s);
  assert.equal(saved.ok, false);
  assert.match(saved.message, /storage full or blocked/);
});

test("an unreadable store is never overwritten", () => {
  const s = memStore();
  s.data[DEMO_PROFILES_KEY] = "{not json";
  assert.equal(saveDemoProfile({ name: "A", settings }, s).ok, false);
  assert.equal(s.data[DEMO_PROFILES_KEY], "{not json");
});

test("demo profiles never touch the draft or session keys", () => {
  const s = memStore();
  saveDemoProfile({ name: "A", settings }, s);
  assert.deepEqual(Object.keys(s.data), [DEMO_PROFILES_KEY]);
  assert.notEqual(DEMO_PROFILES_KEY, "nwp-draft-v1");
  assert.notEqual(DEMO_PROFILES_KEY, DEMO_SESSION_KEY);
});

test("profiles come back newest first", () => {
  const s = memStore();
  const a = saveDemoProfile({ name: "A", settings }, s);
  s.data[DEMO_PROFILES_KEY] = JSON.stringify([
    { ...a.profile, name: "old", id: "1", updated_at: "2020-01-01T00:00:00.000Z" },
    { ...a.profile, name: "new", id: "2", updated_at: "2030-01-01T00:00:00.000Z" },
  ]);
  assert.deepEqual(listDemoProfiles(s).profiles.map((p) => p.name), ["new", "old"]);
});
