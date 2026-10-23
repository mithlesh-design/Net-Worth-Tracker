/* The type scale: one entry per ROLE, not per size. Each carries its
   line-height, letter-spacing and weight, so `text-label` alone sets a
   label. Colour stays with the role colour tokens in globals.css.

   Read by tailwind.config.js (to make the classes) and by lib/utils.js (so
   tailwind-merge knows these are sizes; otherwise it takes `text-label` for a
   colour and drops it beside a colour class). CommonJS because the Tailwind
   config is.

   Two faces. The large heading roles — display and heading — are DM Serif
   Display (globals.css applies the family with the role, so a class never has
   to ask for it); it has one weight, 400, which is already a bold display
   cut. Everything else is Manrope, card titles (bold) and every number
   included: pair the value roles with `tabular-nums` so digits line up in
   columns. Nothing is smaller than `overline` (12px). */
const TYPE_SCALE = {
  // The step headline.
  display: ["clamp(2.125rem, 1.4rem + 2.2vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.012em", fontWeight: "400" }],
  // The hero subtitle under it.
  lead: ["clamp(1rem, 0.95rem + 0.25vw, 1.125rem)", { lineHeight: "1.6", fontWeight: "400" }],
  // A heading for a group of cards.
  heading: ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.005em", fontWeight: "400" }],
  // A card's title.
  title: ["1.125rem", { lineHeight: "1.35", letterSpacing: "-0.012em", fontWeight: "700" }],
  // A row's name: an income, a goal, a contribution, a person.
  subtitle: ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
  // A field label.
  label: ["0.9375rem", { lineHeight: "1.4", fontWeight: "500" }],
  // Running text and callouts.
  body: ["0.9375rem", { lineHeight: "1.6", fontWeight: "400" }],
  // Helper text, hints, the note under a figure.
  help: ["0.8125rem", { lineHeight: "1.5", fontWeight: "400" }],
  // Stat labels, kickers, small group labels. Uppercase is applied where used.
  overline: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.1em", fontWeight: "600" }],
  // Figures, largest to smallest.
  "value-xl": ["clamp(1.875rem, 1.5rem + 1vw, 2.25rem)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
  "value-lg": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
  value: ["1.125rem", { lineHeight: "1.3", fontWeight: "700" }],
  "value-sm": ["0.9375rem", { lineHeight: "1.4", fontWeight: "600" }],
};

module.exports = { TYPE_SCALE, TYPE_ROLES: Object.keys(TYPE_SCALE) };
