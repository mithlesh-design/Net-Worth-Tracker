"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { SectionCard, Button, Input, Label, InfoStrip } from "@/components/ui";
import { useDemoAuth } from "@/components/DemoAuthProvider";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /* TEMPORARY: preview-only demo login. `demo.enabled` is a build-time
     constant that is false in production, so everything below it is the
     original flow. See lib/demo/config.mjs. */
  const demo = useDemoAuth();

  /* NextAuth sends the user back here as ?error=... when a provider is not
     configured, which is the state this build is in. Strip it on arrival so a
     stale failure from the real flow is not carried into the demo session. */
  useEffect(() => {
    if (!demo.enabled) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("error")) return;
    url.searchParams.delete("error");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [demo.enabled]);

  /* One click, no email, no OTP, no provider round trip. The planner is opened
     with a clean URL so no authentication error parameter survives. */
  const startDemoSession = () => {
    setLoading(true);
    demo.signIn(email);
    router.replace("/");
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (demo.enabled) return startDemoSession();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("email", { email, callbackUrl: "/" });
    setEmailSent(true);
    setLoading(false);
  };

  return (
    <AuthLayout hero={{
      title: "Welcome back",
      subtitle: "Sign in to save your plans and pick up where you left off. The planner works without it.",
    }}>
      <SectionCard title="Sign in" icon={LogIn} kicker={demo.enabled ? "Demo mode" : null}>
        <div className="space-y-5">
          <Button variant="outline" size="lg" className="w-full gap-3"
            onClick={() => (demo.enabled ? startDemoSession() : signIn("google", { callbackUrl: "/" }))}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--border-default)" }} />
            <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="h-px flex-1" style={{ background: "var(--border-default)" }} />
          </div>

          {emailSent ? (
            <InfoStrip tone="blue">
              <strong>Check your email.</strong> We sent a magic link to <strong>{email}</strong>.
            </InfoStrip>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email address</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={demo.enabled ? "you@example.com (optional in demo mode)" : "you@example.com"}
                  /* Demo mode must work on one click, so the browser's own
                     required-field block is lifted and an empty box falls back
                     to the default demo identity. */
                  required={!demo.enabled}
                />
              </div>
              <Button type="submit" variant="cta" size="xl" disabled={loading} className="w-full gap-2.5">
                <Mail size={ICON_SIZE.md} />
                {loading ? (demo.enabled ? "Opening planner..." : "Sending...") : "Send Magic Link"}
              </Button>
            </form>
          )}

          <p className="text-center text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {demo.enabled
              ? "Demo mode: no email is sent. You are signed in instantly on this browser, and profiles are saved here only."
              : "The planner works without login. Sign in only to save & load profiles."}
          </p>
        </div>
      </SectionCard>
    </AuthLayout>
  );
}
