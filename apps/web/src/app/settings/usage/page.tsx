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

  if (!usage) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Usage & Plan</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
            {plan?.name}
          </span>
          {plan?.id !== "free" && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="text-sm text-gray-400 hover:text-white"
            >
              {portalMutation.isPending ? "Loading..." : "Manage Billing"}
            </button>
          )}
        </div>
      </div>

      {/* Events usage bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Events this month</span>
          <span>
            {usage.events.used.toLocaleString()} / {usage.events.limit.toLocaleString()}
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              usage.events.percentUsed >= 90
                ? "bg-red-500"
                : usage.events.percentUsed >= 70
                ? "bg-yellow-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(100, usage.events.percentUsed)}%` }}
          />
        </div>
        {usage.events.percentUsed >= 80 && (
          <p className="text-xs text-yellow-400 mt-1">
            {usage.events.percentUsed >= 100
              ? "Limit reached! Upgrade to continue."
              : `${usage.events.remaining.toLocaleString()} events remaining`}
          </p>
        )}
      </div>

      {/* Rules usage */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Rules</span>
          <span>
            {usage.rules.used} / {usage.rules.limit}
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${(usage.rules.used / usage.rules.limit) * 100}%` }}
          />
        </div>
      </div>

      {/* Plan limits */}
      <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-[var(--border)]">
        <div>
          <span className="text-gray-400">Rate limit:</span> <span>{limits?.rateLimit} req/min</span>
        </div>
        <div>
          <span className="text-gray-400">Retention:</span> <span>{limits?.retentionDays} days</span>
        </div>
      </div>

      {/* Overage */}
      {usage.overage.events > 0 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <div className="text-sm text-yellow-400">
            Overage: {usage.overage.events.toLocaleString()} events ($
            {usage.overage.cost.toFixed(2)})
          </div>
        </div>
      )}
    </div>
  );
}
