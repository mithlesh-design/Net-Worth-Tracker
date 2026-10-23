import { test } from "node:test";
import assert from "node:assert/strict";
import { groupIN } from "./format.mjs";

/* The editable amount boxes show this while you read and plain digits while
   you type, so it must never invent or drop a digit. */
test("groupIN groups digits the Indian way", () => {
  assert.equal(groupIN(0), "0");
  assert.equal(groupIN(950), "950");
  assert.equal(groupIN(137433), "1,37,433");
  assert.equal(groupIN(10000000), "1,00,00,000");
  assert.equal(groupIN(-250000), "-2,50,000");
});

test("groupIN keeps a decimal the user typed, up to two places", () => {
  assert.equal(groupIN(12.5), "12.5");
  assert.equal(groupIN(1234567.25), "12,34,567.25");
});

test("groupIN shows nothing odd for a missing or broken value", () => {
  assert.equal(groupIN(undefined), "0");
  assert.equal(groupIN(null), "0");
  assert.equal(groupIN(NaN), "0");
  assert.equal(groupIN("137433"), "1,37,433");
});
