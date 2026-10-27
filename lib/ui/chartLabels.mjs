/* ═══════════════════════════════════════════════════════════════════════════
   CHART ANNOTATION LAYOUT

   The projection chart marks goals, insurance payouts and its reference
   lines (Retire, Deficit, Life) with badges and short labels. Drawn where
   their data says, two events a year apart — or two policies maturing in the
   same year — land on top of each other and their text runs together.

   Two pure steps keep them apart, at any width:

     stackMarkers round markers that would touch move further from the line,
                  so each stays visible and clickable;
     placeLabels  each label takes the first of its candidate positions that
                  stays on the chart and clear of every marker and every label
                  already placed. A label with nowhere to go is left out rather
                  than drawn over another; whatever it said is also in the
                  tooltip and in the list under the chart.

   Boxes are { x, y, w, h } in SVG pixels, y growing downward.
   ═══════════════════════════════════════════════════════════════════════════ */

/* For round markers of radius `r` that want to sit at { x, y }, the y each is
   drawn at so that no two touch. Taken left to right, a marker that would
   touch one already placed moves a marker's width further out — `dir` +1 is
   down (payouts hang below the line), -1 up (goal pins float above it) —
   until it is clear. Positions, not levels: on a sloping line two neighbours
   start at different heights, and "one level down" from one can land exactly
   on the other. Order-independent. */
export function stackMarkers(markers, { r, gap = 2, dir = 1 }) {
  const size = r * 2 + gap;
  const placed = [];
  const out = new Array(markers.length);
  const order = markers.map((m, i) => [m, i]).sort((a, b) => a[0].x - b[0].x);
  for (const [m, i] of order) {
    let y = m.y;
    while (placed.some((p) => Math.abs(p.x - m.x) < size && Math.abs(p.y - y) < size)) y += dir * size;
    placed.push({ x: m.x, y });
    out[i] = y;
  }
  return out;
}

export const overlaps = (a, b, pad = 0) =>
  a.x < b.x + b.w + pad && b.x < a.x + a.w + pad &&
  a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

const inside = (r, b) =>
  r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h;

/* `labels` is a list of { candidates: [box, …] } in priority order; the result
   is, for each, the box it was given or null. `obstacles` are boxes a label
   must not cover (the markers). `pad` keeps a little air between neighbours. */
export function placeLabels(labels, { bounds, obstacles = [], pad = 2 }) {
  const taken = [...obstacles];
  return labels.map((label) => {
    const box = label.candidates.find(
      (c) => inside(c, bounds) && !taken.some((t) => overlaps(c, t, pad)));
    if (!box) return null;
    taken.push(box);
    return box;
  });
}

/* The candidate boxes for a reference line's label: beside the line at the
   top of the plot, on the side with more room first, then the same two a row
   lower, and so on; then, from the bottom of the plot up, for a line whose
   top is taken (a goal pin at the peak beside the Retire line). */
export function refLabelCandidates(x, { w, h, top, bottom = null, rows = 3, gap = 6, rightFirst = true }) {
  const out = [];
  const beside = (y) => {
    const right = { x: x + gap, y, w, h };
    const left = { x: x - gap - w, y, w, h };
    out.push(...(rightFirst ? [right, left] : [left, right]));
  };
  for (let r = 0; r < rows; r++) beside(top + r * (h + 2));
  if (bottom !== null) for (let r = 0; r < 2; r++) beside(bottom - h - r * (h + 2));
  return out;
}

/* Candidate boxes for the text beside a round badge centred at (cx, cy):
   right of it, left of it, then centred under it. */
export function badgeLabelCandidates(cx, cy, { r, w, h, gap = 4 }) {
  const y = cy - h / 2;
  return [
    { x: cx + r + gap, y, w, h },
    { x: cx - r - gap - w, y, w, h },
    { x: cx - w / 2, y: cy + r + 2, w, h },
  ];
}
