"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { getUsage, getBillingPortal } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

export default function UsagePage() {
  const { user } = useAuth();

  const { data: usageData } = useQuery({
    queryKey: ["usage"],
    queryFn: () => getUsage(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const portalMutation = useMutation({
    mutationFn: () => getBillingPortal(),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const usage = usageData?.usage;
  const limits = usageData?.limits;
  const plan = usageData?.plan;

  if (!usage) return <div className="text-[var(--muted)]">Loading...</div>;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Usage & Plan</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono px-2 py-1 bg-[var(--accent-muted)] text-[var(--accent)] rounded-none">
            {plan?.name}
          </span>
          {plan?.id !== "free" && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              {portalMutation.isPending ? "Loading..." : "Manage Billing"}
            </button>
          )}
        </div>
      </div>

      {/* Events usage bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[var(--muted)] font-mono text-xs uppercase tracking-wider">Events this month</span>
          <span className="font-mono text-sm">
            {usage.events.used.toLocaleString()} / {usage.events.limit.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--border)] rounded-none overflow-hidden">
          <div
            className={`h-full transition-all rounded-none ${
              usage.events.percentUsed >= 90
                ? "bg-[var(--error)]"
                : usage.events.percentUsed >= 70
                ? "bg-[var(--warning)]"
                : "bg-[var(--accent)]"
            }`}
            style={{ width: `${Math.min(100, usage.events.percentUsed)}%` }}
          />
        </div>
        {usage.events.percentUsed >= 80 && (
          <p className="text-xs text-[var(--warning)] mt-1">
            {usage.events.percentUsed >= 100
              ? "Limit reached! Upgrade to continue."
              : `${usage.events.remaining.toLocaleString()} events remaining`}
          </p>
        )}
      </div>

      {/* Rules usage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[var(--muted)] font-mono text-xs uppercase tracking-wider">Rules</span>
          <span className="font-mono text-sm">
            {usage.rules.used} / {usage.rules.limit}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--border)] rounded-none overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all rounded-none"
            style={{ width: `${(usage.rules.used / usage.rules.limit) * 100}%` }}
          />
        </div>
      </div>

      {/* Plan limits */}
      <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-[var(--border)]">
        <div>
          <span className="text-[var(--muted)] font-mono text-xs">Rate limit:</span> <span className="font-mono">{limits?.rateLimit} req/min</span>
        </div>
        <div>
          <span className="text-[var(--muted)] font-mono text-xs">Retention:</span> <span className="font-mono">{limits?.retentionDays} days</span>
        </div>
      </div>

      {/* Overage */}
      {usage.overage.events > 0 && (
        <div className="mt-4 p-3 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-none">
          <div className="text-sm text-[var(--warning)]">
            Overage: {usage.overage.events.toLocaleString()} events ($
            {usage.overage.cost.toFixed(2)})
          </div>
        </div>
      )}
    </div>
  );
}
