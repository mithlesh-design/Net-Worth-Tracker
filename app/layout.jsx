import "./globals.css";
import { Manrope, DM_Serif_Display } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import { DemoAuthProvider } from "@/components/DemoAuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import IconProvider from "@/components/IconProvider";

/* Self-hosted at build time by next/font, so there is no request to Google at
   runtime. Exposed as variables that --font-sans / --font-display in
   globals.css resolve through.

   Manrope is the interface — body, labels, card titles, fields, every
   number — and is variable, loaded as such (no `weight` list), so one file
   covers every weight the type scale uses.

   DM Serif Display is for the large headings only: the step headline and
   group headings. It is a display face with a single, already-heavy weight,
   so there is one upright file and no italic. */
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

/* The phone browser's own bar in the header's navy, which is the same in
   both themes, so the page reads as one surface up to the status bar. */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08203F",
};

export const metadata = {
  title: "Avdesh Mishra Capitals — Financial Planner",
  description:
    "Plan your income, goals and investments, and see the path to financial independence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body>
        <SessionProvider>
          {/* TEMPORARY: preview-only demo login. See lib/demo/config.mjs —
              it folds to a no-op unless NEXT_PUBLIC_DEMO_AUTH=true in dev. */}
          <DemoAuthProvider>
            <ThemeProvider>
              <IconProvider>{children}</IconProvider>
            </ThemeProvider>
          </DemoAuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
