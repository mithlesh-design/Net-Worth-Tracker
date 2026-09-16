import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { DemoAuthProvider } from "@/components/DemoAuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import IconProvider from "@/components/IconProvider";

export const metadata = {
  title: "Networth Planner — Financial Independence & Property Planner",
  description:
    "Interactive dashboard to project your net worth, plan property purchases, and track your path to financial independence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body style={{ fontFamily: "var(--font-sans)" }}>
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
