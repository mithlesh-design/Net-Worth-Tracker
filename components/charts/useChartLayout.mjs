"use client";

import { useState, useEffect } from "react";

/* Below this plot width a chart is "compact": a phone, or a narrow column.
   Measured on the chart itself rather than read from the viewport, so a chart
   in a narrow column of a wide screen is laid out for the room it actually
   has. */
export const COMPACT_BELOW = 480;

/* Everything about a chart's frame that depends on how wide it is, in one
   place, so the projection, goal-gap and mini charts cannot drift apart.

   Attach `ref` to the element that holds the ResponsiveContainer. Tick text
   stays 12px at every width (nothing in the app is smaller); what gives way
   on a phone is the Y axis gutter, the margins and the marker size. */
export function useChartLayout() {
  /* A callback ref, so a plot that mounts after the first render (a chart
     with no data yet renders nothing) is still measured. */
  const [el, setEl] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  const compact = width > 0 && width < COMPACT_BELOW;

  return {
    ref: setEl,
    width,
    compact,
    /* Top room is for the goal markers that float above the line. */
    margin: compact
      ? { top: 32, right: 8, bottom: 14, left: 0 }
      : { top: 40, right: 15, bottom: 14, left: 5 },
    /* "₹25.1Cr" at 12px is about 45px, plus the 6px Recharts reserves for
       the tick line even when it is hidden, plus tickMargin. The old 70px
       gutter took a third of a 245px phone chart. */
    yAxisWidth: compact ? 56 : 64,
    tickMargin: compact ? 4 : 8,
    markerR: compact ? 11 : 14,
    /* Spread onto <XAxis>: the first and last ages always show, and the
       ones between drop out rather than collide. */
    xTicks: { interval: "preserveStartEnd", minTickGap: compact ? 12 : 24 },
  };
}

/* Where a reference line's label goes: to the right of its line, unless the
   line sits in the right quarter of the chart, where a label to its right
   would run off the edge. */
export function refLabelPosition(x, [lo, hi]) {
  const at = hi > lo ? (x - lo) / (hi - lo) : 0;
  return at > 0.75 ? "insideTopRight" : "insideTopLeft";
}

/* The year a compact chart is showing in its readout. A tap, a press or a
   drag on the chart picks the year under the finger (Recharts reports touch
   through the same handlers as the mouse), and lifting the finger keeps it:
   the readout under the chart is what the user is reading, not a hover.
   Spread `handlers` onto the chart. */
export function useChartSelection(count, defaultIndex) {
  const [picked, setPicked] = useState(null);
  const pick = (state) => {
    if (state?.activeTooltipIndex != null) setPicked(state.activeTooltipIndex);
  };
  const index = picked !== null && picked < count ? picked : defaultIndex;
  return {
    index: Math.min(Math.max(index ?? 0, 0), Math.max(count - 1, 0)),
    handlers: { onMouseMove: pick, onMouseDown: pick, onClick: pick },
  };
}
