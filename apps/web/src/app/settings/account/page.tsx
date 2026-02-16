"use client";

import { useAuth } from "@/components/auth-provider";

export default function AccountPage() {
  const { user, org } = useAuth();

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded p-6">
      <h2 className="font-medium mb-4">Account</h2>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-[var(--muted)] font-mono text-xs">Email:</span> {user?.email}
        </div>
        <div>
          <span className="text-[var(--muted)] font-mono text-xs">Organization:</span> {org?.name}
        </div>
      </div>
    </div>
  );
}
