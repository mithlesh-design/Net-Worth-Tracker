"use client";

import { Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { SectionCard } from "@/components/ui";

export default function VerifyPage() {
  return (
    <AuthLayout hero={{
      title: "Check your email",
      subtitle: "Open the link we sent, in this browser, and your plan opens where you left off.",
    }}>
      <SectionCard title="Magic link sent" icon={Mail}>
        <p className="text-body" style={{ color: "var(--text-secondary)" }}>
          A sign-in link is on its way to your inbox. Opening it signs you in, and
          creates your account if you are new.
        </p>
        <p className="mt-4 text-help" style={{ color: "var(--text-muted)" }}>
          Open it on this device: that is where your answers are kept until you
          are signed in. It can take a minute to arrive; check your spam folder too.
        </p>
      </SectionCard>
    </AuthLayout>
  );
}
