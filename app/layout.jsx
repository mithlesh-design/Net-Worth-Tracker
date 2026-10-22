import "./globals.css";
import { Manrope, Playfair_Display } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import { DemoAuthProvider } from "@/components/DemoAuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import IconProvider from "@/components/IconProvider";

/* Self-hosted at build time by next/font, so there is no request to Google at
   runtime. Exposed as variables that --font-sans / --font-serif in
   globals.css resolve through. */
const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata = {
  title: "Avdesh Mishra Capitals — Financial Planner",
  description:
    "Plan your income, goals and investments, and see the path to financial independence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
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
