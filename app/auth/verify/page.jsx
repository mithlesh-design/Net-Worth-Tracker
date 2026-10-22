"use client";

import { Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { SectionCard } from "@/components/ui";

export default function VerifyPage() {
  return (
    <AuthLayout hero={{
      title: "Check your email",
      subtitle: "One click on the link we sent and you are back in your plan.",
    }}>
      <SectionCard title="Magic link sent" icon={Mail}>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          A sign-in link has been sent to your email address.
          Click the link in the email to sign in.
        </p>
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          You can close this page and click the link from your email.
        </p>
      </SectionCard>
    </AuthLayout>
  );
}
