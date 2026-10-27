import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stackMarkers, placeLabels, overlaps, refLabelCandidates, badgeLabelCandidates,
} from "./chartLabels.mjs";

const bounds = { x: 0, y: 0, w: 600, h: 400 };

const R = 10;
const touching = (a, b) => Math.abs(a.x - b.x) < R * 2 + 2 && Math.abs(a.y - b.y) < R * 2 + 2;

test("markers far apart stay where their data puts them", () => {
  const m = [{ x: 10, y: 50 }, { x: 100, y: 60 }, { x: 200, y: 70 }];
  assert.deepEqual(stackMarkers(m, { r: R }), [50, 60, 70]);
});

test("markers at the same spot stack one below the other", () => {
  const m = [{ x: 100, y: 50 }, { x: 100, y: 50 }, { x: 100, y: 50 }];
  assert.deepEqual(stackMarkers(m, { r: R }), [50, 72, 94]);
});

test("goal pins stack upward", () => {
  assert.deepEqual(stackMarkers([{ x: 100, y: 50 }, { x: 100, y: 50 }], { r: R, dir: -1 }), [50, 28]);
});

test("on a sloping line no two neighbours ever touch", () => {
  /* Payouts a year apart on a falling line: the second starts lower than the
     first, and stacking by level alone put it exactly on the third. */
  const m = [{ x: 100, y: 40 }, { x: 116, y: 52 }, { x: 132, y: 64 }, { x: 148, y: 76 }];
  const ys = stackMarkers(m, { r: R });
  const placed = m.map((p, i) => ({ x: p.x, y: ys[i] }));
  placed.forEach((a, i) => placed.slice(i + 1).forEach((b) => assert.ok(!touching(a, b), JSON.stringify([a, b]))));
});

test("stacking does not depend on the order markers are given in", () => {
  const m = [{ x: 120, y: 50 }, { x: 100, y: 50 }];
  assert.deepEqual(stackMarkers(m, { r: R }), [72, 50]);
});

test("two labels wanting the same spot: the second takes its next candidate", () => {
  const a = { candidates: [{ x: 100, y: 50, w: 60, h: 14 }] };
  const b = { candidates: [{ x: 110, y: 50, w: 60, h: 14 }, { x: 110, y: 70, w: 60, h: 14 }] };
  const [pa, pb] = placeLabels([a, b], { bounds });
  assert.deepEqual(pa, a.candidates[0]);
  assert.deepEqual(pb, b.candidates[1]);
  assert.ok(!overlaps(pa, pb));
});

test("a label with nowhere clear to go is left out, not drawn on top", () => {
  const a = { candidates: [{ x: 100, y: 50, w: 60, h: 14 }] };
  const b = { candidates: [{ x: 120, y: 52, w: 60, h: 14 }] };
  assert.deepEqual(placeLabels([a, b], { bounds }).map(Boolean), [true, false]);
});

test("labels never cover an obstacle or leave the chart", () => {
  const marker = { x: 95, y: 45, w: 20, h: 20 };
  const off = { candidates: [{ x: 590, y: 10, w: 60, h: 14 }] };
  const blocked = { candidates: [{ x: 100, y: 50, w: 60, h: 14 }, { x: 200, y: 50, w: 60, h: 14 }] };
  const [p1, p2] = placeLabels([off, blocked], { bounds, obstacles: [marker] });
  assert.equal(p1, null, "a label running off the right edge was kept");
  assert.equal(p2.x, 200, "a label was placed over the marker");
});

test("a reference label near the left edge flips to the right of its line", () => {
  /* The Deficit label used to sit left of its line and be cut off at the axis. */
  const plot = { x: 60, y: 0, w: 500, h: 300 };
  const c = refLabelCandidates(70, { w: 50, h: 14, top: 4, rightFirst: false });
  const [box] = placeLabels([{ candidates: c }], { bounds: plot });
  assert.ok(box.x >= 70, "the label should move to the right of the line");
});

test("two policy labels at the same age do not overlap", () => {
  const plot = { x: 0, y: 0, w: 600, h: 300 };
  const a = badgeLabelCandidates(300, 120, { r: 10, w: 90, h: 14 });
  const b = badgeLabelCandidates(300, 144, { r: 10, w: 90, h: 14 });
  const [pa, pb] = placeLabels([{ candidates: a }, { candidates: b }], { bounds: plot });
  assert.ok(pa && pb);
  assert.ok(!overlaps(pa, pb));
});

test("a reference label whose top is taken drops to the bottom of the plot", () => {
  /* A goal pin at the peak beside the Retire line used to cost it its label. */
  const plot = { x: 0, y: 0, w: 600, h: 300 };
  const pin = { x: 280, y: 0, w: 60, h: 60 };
  const c = refLabelCandidates(300, { w: 60, h: 14, top: 4, bottom: 300 });
  const [box] = placeLabels([{ candidates: c }], { bounds: plot, obstacles: [pin] });
  assert.ok(box, "the Retire label was dropped");
  assert.ok(box.y > 200, "it should sit along the bottom");
});
