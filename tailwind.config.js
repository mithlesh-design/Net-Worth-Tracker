/** @type {import('tailwindcss').Config} */
module.exports = {
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
        serif: ["var(--font-serif)"],
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
