import { test } from "node:test";
import assert from "node:assert/strict";
import { ageFromDob, effectiveAge, isAgeDerived, todayISO } from "./age.mjs";

const on = (s) => new Date(s);

test("a birthday already passed this year counts", () => {
  assert.equal(ageFromDob("1990-03-15", on("2026-09-09")), 36);
});

test("a birthday still to come this year does not count yet", () => {
  assert.equal(ageFromDob("1990-12-15", on("2026-09-09")), 35);
});

test("the birthday itself counts", () => {
  assert.equal(ageFromDob("1990-09-09", on("2026-09-09")), 36);
});

test("the day before the birthday does not", () => {
  assert.equal(ageFromDob("1990-09-10", on("2026-09-09")), 35);
});

test("29 February is handled without drifting", () => {
  // Born on a leap day; on 28 Feb of a non-leap year the birthday has not passed.
  assert.equal(ageFromDob("2000-02-29", on("2026-02-28")), 25);
  assert.equal(ageFromDob("2000-02-29", on("2026-03-01")), 26);
});

test("a date of birth of today gives zero, not null", () => {
  assert.equal(ageFromDob("2026-09-09", on("2026-09-09")), 0);
});

test("a future date of birth gives a negative age for validate to reject", () => {
  assert.ok(ageFromDob("2030-01-01", on("2026-09-09")) < 0);
});

test("millisecond division would be wrong here; calendar arithmetic is not", () => {
  // 1996-02-29 to 2026-02-28 is 10957 days = 29.999... Julian years.
  // A naive ms/31536000000 rounds this to 30. The correct answer is 29.
  assert.equal(ageFromDob("1996-02-29", on("2026-02-28")), 29);
});

test("a null or unparseable date of birth returns null rather than NaN", () => {
  assert.equal(ageFromDob(null), null);
  assert.equal(ageFromDob(""), null);
  assert.equal(ageFromDob("not a date"), null);
});

test("effectiveAge prefers date of birth over the currentAge fallback", () => {
  const plan = { personal: { dob: "1990-01-01" }, currentAge: 28 };
  assert.equal(effectiveAge(plan), ageFromDob("1990-01-01"));
  assert.notEqual(effectiveAge(plan), 28);
});

test("effectiveAge falls back to currentAge for a legacy profile", () => {
  assert.equal(effectiveAge({ personal: { dob: null }, currentAge: 28 }), 28);
  assert.equal(effectiveAge({ currentAge: 28 }), 28);
});

test("isAgeDerived reports which source is authoritative", () => {
  assert.equal(isAgeDerived({ personal: { dob: "1990-01-01" }, currentAge: 28 }), true);
  assert.equal(isAgeDerived({ personal: { dob: null }, currentAge: 28 }), false);
});

test("an age above any plausible life expectancy is still returned, for validate", () => {
  assert.ok(ageFromDob("1900-01-01", on("2026-09-09")) > 120);
});

test("todayISO produces a zero-padded date input value", () => {
  assert.equal(todayISO(on("2026-01-05")), "2026-01-05");
  assert.equal(todayISO(on("2026-12-31")), "2026-12-31");
});
