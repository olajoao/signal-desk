"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-[var(--card)] border-2 border-[var(--border-strong)] rounded">
        <h1 className="text-2xl font-bold mb-2">Reset password</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {sent ? (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
            If an account exists for {email}, a reset link has been sent. Check your inbox.
            <div className="mt-4">
              <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-strong)]">
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder-[var(--dim)] focus:border-[var(--accent)] focus:outline-none"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded transition-colors"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-strong)]">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
