"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user, org } = await login({ email, password });
      setAuth(user, org);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-[var(--card)] border-2 border-[var(--border-strong)] rounded">
        <h1 className="text-2xl font-bold mb-6">Sign in to SignalDesk</h1>

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

          <div>
            <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder-[var(--dim)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-[var(--dim)] hover:text-[var(--muted)]">
            Forgot password?
          </Link>
        </div>

        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--accent)] hover:text-[var(--accent-strong)]">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
