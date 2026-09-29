import { test } from "node:test";
import assert from "node:assert/strict";
import { totalCoverage } from "./insurance.mjs";

const policy = (over = {}) => ({ enabled: true, coverage: 500000, unlimitedCoverage: false, ...over });

test("fixed cover is summed across the policies in force", () => {
  const c = totalCoverage({ self: policy(), parents: policy({ coverage: 300000 }) });
  assert.deepEqual(c, { self: 500000, parents: 300000, total: 800000, unlimited: false });
});

test("unlimited cover sets the flag and adds nothing, not the amount it keeps", () => {
  const c = totalCoverage({ self: policy({ unlimitedCoverage: true }), parents: policy({ coverage: 300000 }) });
  assert.deepEqual(c, { self: 0, parents: 300000, total: 300000, unlimited: true });
});

test("a policy switched off counts for nothing, unlimited or not", () => {
  const c = totalCoverage({ self: policy({ enabled: false, unlimitedCoverage: true }) });
  assert.deepEqual(c, { self: 0, parents: 0, total: 0, unlimited: false });
});
