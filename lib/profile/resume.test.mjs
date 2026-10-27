import { test } from "node:test";
import assert from "node:assert/strict";
import { saveResume, takeResume, RESUME_MAX_AGE_MS } from "./resume.mjs";

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    size: () => m.size,
  };
}

const plan = { currentAge: 35, personal: { fullName: "Asha" } };

test("the plan and the destination come back exactly as saved", () => {
  const s = memoryStorage();
  assert.equal(saveResume({ plan, step: "review" }, s, 1000), true);
  assert.deepEqual(takeResume(s, 2000), { plan, step: "review" });
});

test("it is read once: a second read finds nothing", () => {
  const s = memoryStorage();
  saveResume({ plan, step: "review" }, s, 1000);
  takeResume(s, 2000);
  assert.equal(takeResume(s, 3000), null);
  assert.equal(s.size(), 0);
});

test("a record older than an hour is discarded, not resumed", () => {
  const s = memoryStorage();
  saveResume({ plan, step: "review" }, s, 0);
  assert.equal(takeResume(s, RESUME_MAX_AGE_MS + 1), null);
  assert.equal(s.size(), 0, "the stale record should be removed too");
});

test("a damaged record is ignored", () => {
  const s = memoryStorage();
  s.setItem("nwp-resume-v1", "{not json");
  assert.equal(takeResume(s), null);
  s.setItem("nwp-resume-v1", JSON.stringify({ v: 1, at: Date.now(), step: "review" }));
  assert.equal(takeResume(s), null, "a record without a plan must not resume");
});

test("storage that throws means starting again, never a crash", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} };
  assert.equal(saveResume({ plan, step: "review" }, broken), false);
  assert.equal(takeResume(broken), null);
});
