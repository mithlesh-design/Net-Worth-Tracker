"use client";

import { Sparkles, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ICON_SIZE } from "@/lib/ui/icons.mjs";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs mb-6 transition"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={ICON_SIZE.sm} /> Back to Planner
        </Link>

        <div className="rounded-2xl border p-8 text-center"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--accent-soft)' }}>
            <Mail size={ICON_SIZE.lg} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Check your email</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            A sign-in link has been sent to your email address.
            Click the link in the email to sign in.
          </p>
          <p className="mt-4 text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
            You can close this page and click the link from your email.
          </p>
        </div>
      </div>
    </div>
  );
}
