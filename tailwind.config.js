const { TYPE_SCALE } = require("./lib/ui/type-scale.cjs");

/** @type {import('tailwindcss').Config} */
module.exports = {
  /* hover: styles only where there is a real pointer. On a phone a tapped
     button otherwise keeps its hover colour until the next tap elsewhere. */
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            950: "var(--brand-navy-950)",
            900: "var(--brand-navy-900)",
            800: "var(--brand-navy-800)",
            700: "var(--brand-navy-700)",
            100: "var(--brand-navy-100)",
            "050": "var(--brand-navy-050)",
          },
          gold: {
            600: "var(--brand-gold-600)",
            500: "var(--brand-gold-500)",
            400: "var(--brand-gold-400)",
            100: "var(--brand-gold-100)",
            "050": "var(--brand-gold-050)",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"],
      },
      /* Role sizes: text-display, text-title, text-label, text-value-lg …
         See lib/ui/type-scale.cjs for what each is for. */
      fontSize: TYPE_SCALE,
      /* p-card / p-item: the fluid card padding tokens in globals.css. */
      spacing: {
        card: "var(--card-padding)",
        item: "var(--item-padding)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
