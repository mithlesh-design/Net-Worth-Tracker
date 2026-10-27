"use client";

import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { SectionCard, Button, Input, Label, InfoStrip } from "@/components/ui";
import { useDemoAuth, useAppSession } from "@/components/DemoAuthProvider";
import { useAuthConfig } from "@/components/AuthConfigProvider";
import { RESUME_URL } from "@/lib/profile/resume.mjs";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

/* NextAuth sends failures back here as ?error=Code. Said in plain words; any
   code not listed gets the general line. */
const ERRORS = {
  OAuthAccountNotLinked: "This email already has an account with a different sign-in method. Use the one you signed up with.",
  Verification: "That sign-in link has expired or has already been used. Ask for a new one below.",
  EmailSignin: "We couldn't send the sign-in email. Check the address and try again.",
  AccessDenied: "Sign-in was cancelled.",
};
const GENERAL_ERROR = "Sign-in didn't work. Please try again.";

/* Log in and sign up are one step: the first Google sign-in or email link
   creates the account. Every way out — signed in, or Back to planner — goes
   to RESUME_URL, where the planner restores the plan saved before the user
   came here (lib/profile/resume.mjs) and, once signed in, opens the results.

   Offers only the methods this deployment has (useAuthConfig); /auth/* is
   redirected to the planner when it has none. useSearchParams needs a
   Suspense boundary to prerender. */
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const params = useSearchParams();
  const forResults = params.get("next") === "results";
  const errorCode = params.get("error");
  const auth = useAuthConfig();
  const { data: session } = useAppSession();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /* TEMPORARY: preview-only demo login. `demo.enabled` is a build-time
     constant that is false in production, so everything below it is the
     original flow. See lib/demo/config.mjs. */
  const demo = useDemoAuth();

  /* Already signed in (the back button, another tab): straight to the plan. */
  useEffect(() => {
    if (session) router.replace(RESUME_URL);
  }, [session, router]);

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

  /* One click, no email, no OTP, no provider round trip. */
  const startDemoSession = () => {
    setLoading(true);
    demo.signIn(email);
    router.replace(RESUME_URL);
  };

  const withGoogle = () => (demo.enabled ? startDemoSession() : signIn("google", { callbackUrl: RESUME_URL }));

  /* NextAuth emails the link, then sends the browser to /auth/verify. */
  const withEmail = async (e) => {
    e.preventDefault();
    if (demo.enabled) return startDemoSession();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("email", { email, callbackUrl: RESUME_URL });
  };

  const showGoogle = demo.enabled || auth.methods.google;
  const showEmail = demo.enabled || auth.methods.email;
  const error = !demo.enabled && errorCode ? (ERRORS[errorCode] ?? GENERAL_ERROR) : null;

  return (
    <AuthLayout hero={forResults ? {
      title: "One step to your results",
      subtitle: "Log in, or create your account in the same step. Everything you’ve entered is kept, and your results open as soon as you’re in.",
    } : {
      title: "Log in or sign up",
      subtitle: "Save your plans and pick up where you left off. New here? The same step creates your account.",
    }}>
      <SectionCard title="Log in or sign up" icon={LogIn} kicker={demo.enabled ? "Demo mode" : null}>
        <div className="space-y-5">
          {error && <InfoStrip tone="red">{error}</InfoStrip>}

          {showGoogle && (
            <Button variant="outline" size="lg" className="w-full gap-3" onClick={withGoogle} disabled={loading}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          )}

          {showGoogle && showEmail && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: "var(--border-default)" }} />
              <span className="text-overline uppercase" style={{ color: "var(--text-muted)" }}>or</span>
              <div className="h-px flex-1" style={{ background: "var(--border-default)" }} />
            </div>
          )}

          {showEmail && (
            <form onSubmit={withEmail} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email address</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
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
                {loading
                  ? (demo.enabled ? "Opening your plan..." : "Sending...")
                  : (demo.enabled ? "Continue" : "Email me a sign-in link")}
              </Button>
            </form>
          )}

          <p className="text-center text-help" style={{ color: "var(--text-muted)" }}>
            {demo.enabled
              ? "Demo mode: no email is sent. You are signed in instantly on this browser, and profiles are saved here only."
              : "New here? Continuing with Google or an email link creates your account. No password needed."}
          </p>
        </div>
      </SectionCard>
    </AuthLayout>
  );
}
