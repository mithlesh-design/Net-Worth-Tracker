"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useDemoAuth } from "@/components/DemoAuthProvider";

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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs mb-6 transition"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={13} /> Back to Planner
        </Link>

        <div className="rounded-2xl border p-8"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'var(--button-primary-bg)' }}>
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Net Worth Tracker</h1>
                {demo.enabled && (
                  <span className="rounded-full px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wide"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    Demo mode
                  </span>
                )}
              </div>
              <p className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>Sign in to save your profiles</p>
            </div>
          </div>

          <button
            onClick={() => (demo.enabled ? startDemoSession() : signIn("google", { callbackUrl: "/" }))}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition shadow-sm"
            style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
            <span className="text-[0.6rem] font-medium" style={{ color: 'var(--text-muted)' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
          </div>

          {emailSent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--info-emerald-bg)' }}>
                <Mail size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Check your email</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>We sent a magic link to <strong>{email}</strong></p>
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div>
                <label className="text-[0.63rem] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={demo.enabled ? "you@example.com (optional in demo mode)" : "you@example.com"}
                  /* Demo mode must work on one click, so the browser's own
                     required-field block is lifted and an empty box falls back
                     to the default demo identity. */
                  required={!demo.enabled}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-2.5 text-sm font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--button-primary-bg)', color: 'var(--button-primary-text)' }}
              >
                <Mail size={14} />
                {loading ? (demo.enabled ? "Opening planner..." : "Sending...") : "Send Magic Link"}
              </button>
            </form>
          )}

          <p className="mt-5 text-[0.55rem] text-center" style={{ color: 'var(--text-muted)' }}>
            {demo.enabled
              ? "Demo mode: no email is sent. You are signed in instantly on this browser, and profiles are saved here only."
              : "The planner works without login. Sign in only to save & load profiles."}
          </p>
        </div>
      </div>
    </div>
  );
}
