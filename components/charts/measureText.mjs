"use client";

/* The width in px of one line of chart text, measured in the page's own font,
   so a label's box is its real size rather than a guess per character. Off
   the page (server render, tests) it falls back to an estimate. Cached: a
   chart re-lays its labels on every frame of a slider drag. */
let ctx = null;
let family = null;
const cache = new Map();

export function measureText(text, { size = 12, weight = 600 } = {}) {
  const key = `${weight}|${size}|${text}`;
  if (cache.has(key)) return cache.get(key);
  let width = text.length * size * 0.62;
  if (typeof document !== "undefined") {
    ctx ??= document.createElement("canvas").getContext("2d");
    family ??= getComputedStyle(document.body).fontFamily;
    if (ctx) {
      ctx.font = `${weight} ${size}px ${family}`;
      width = ctx.measureText(text).width;
    }
  }
  /* A pixel of slack each side, so neighbours never quite touch. */
  width = Math.ceil(width) + 2;
  cache.set(key, width);
  return width;
}
