"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { acceptInvite, type AcceptInviteResponse } from "@/lib/auth";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AcceptInviteResponse | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;

    acceptInvite(token)
      .then((res) => {
        if (res.needsSignup) {
          // Redirect to signup with invite params
          const params = new URLSearchParams({
            invite: res.inviteToken ?? token,
            email: res.email ?? "",
          });
          router.push(`/signup?${params}`);
        } else {
          setResult(res);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to accept invite");
      })
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)]">Missing invite token.</div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-[var(--muted)]">Processing invite...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-full max-w-md p-8 bg-[var(--card)] border-2 border-[var(--border-strong)] rounded text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-strong)] text-sm">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-full max-w-md p-8 bg-[var(--card)] border-2 border-[var(--border-strong)] rounded text-center">
          <div className="text-[var(--accent)] mb-2">Invite accepted!</div>
          <p className="text-[var(--muted)] text-sm mb-4">
            You&apos;ve joined {result.org?.name} as {result.membership?.role}.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-dim)] text-black rounded transition-colors"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
