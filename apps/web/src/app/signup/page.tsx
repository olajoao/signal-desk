"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { signup } from "@/lib/auth";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;
  const inviteEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user, org } = await signup({
        email,
        password,
        name: name || undefined,
        orgName: inviteToken ? undefined : orgName,
        inviteToken,
      });
      setAuth(user, org);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-[var(--card)] border-2 border-[var(--border-strong)] rounded">
        <h1 className="text-2xl font-bold mb-6">
          {inviteToken ? "Accept invite" : "Create your account"}
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!inviteToken && (
            <div>
              <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Organization name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder-[var(--dim)] focus:border-[var(--accent)] focus:outline-none"
                placeholder="Acme Inc"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Your name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder-[var(--dim)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] placeholder-[var(--dim)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="you@company.com"
              required
              readOnly={!!inviteToken}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Password</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-dim)] disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded transition-colors"
          >
            {loading ? "Creating account..." : inviteToken ? "Join organization" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:text-[var(--accent-strong)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
