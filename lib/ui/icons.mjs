/* The icon scale.

   Four steps, not nine. Anything outside this set is drift: pick the nearest
   step instead of inventing a size. IconProvider applies `md` and the stroke
   weight app-wide, so most call sites pass no size at all. */
export const ICON_SIZE = {
  xs: 12,  // dense inline runs: field errors, chart tooltips
  sm: 14,  // inside compact controls and table rows
  md: 16,  // the default: buttons, card headers, the goal picker
  lg: 20,  // page-level and empty-state icons
};

/* Lucide ships stroke 2, drawn for 24px. At the 12-16px this app uses it reads
   heavy and slightly blunt; 1.75 keeps the line crisp without going fragile. */
export const ICON_STROKE = 1.75;
