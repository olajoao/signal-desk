"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Missing reset token");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-[var(--card)] border-2 border-[var(--border-strong)] rounded">
        <h1 className="text-2xl font-bold mb-6">Set new password</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {!token ? (
          <div className="text-[var(--muted)] text-sm">
            Invalid or missing reset token.{" "}
            <Link href="/forgot-password" className="text-[var(--accent)] hover:text-[var(--accent-strong)]">
              Request a new one
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder-[var(--dim)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder-[var(--dim)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded transition-colors"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
