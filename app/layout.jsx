import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "Networth Planner — Financial Independence & Property Planner",
  description:
    "Interactive dashboard to project your net worth, plan property purchases, and track your path to financial independence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
