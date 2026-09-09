"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Sparkles, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
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

        <div className="rounded-3xl border p-8"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', boxShadow: '0 2px 8px var(--shadow-color)' }}>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Net Worth Tracker</h1>
              <p className="text-[0.55rem]" style={{ color: 'var(--text-muted)' }}>Sign in to save your profiles</p>
            </div>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
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
                <Mail size={20} className="text-emerald-500" />
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
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 py-2.5 text-sm font-bold text-white transition shadow-sm flex items-center justify-center gap-2"
              >
                <Mail size={14} />
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          )}

          <p className="mt-5 text-[0.55rem] text-center" style={{ color: 'var(--text-muted)' }}>
            The planner works without login. Sign in only to save & load profiles.
          </p>
        </div>
      </div>
    </div>
  );
}
