"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { getPlans, getUsage, createCheckoutSession, getBillingPortal } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

export default function PlansPage() {
  const { user } = useAuth();

  const { data: usageData } = useQuery({
    queryKey: ["usage"],
    queryFn: () => getUsage(),
    enabled: !!user,
  });

  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: () => getPlans(),
    enabled: !!user,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => createCheckoutSession(planId),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => getBillingPortal(),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const plan = usageData?.plan;

  if (!plansData) return <div className="text-gray-400">Loading...</div>;

  const tierOrder = ["free", "pro", "max"] as const;
  const currentTierIdx = tierOrder.indexOf((plan?.id ?? "free") as typeof tierOrder[number]);
  const overageInfo: Record<string, { label: string; className: string }> = {
    free: { label: "Hard limit — events rejected", className: "text-red-400" },
    pro: { label: "$1 per 1,000 overage events", className: "text-gray-400" },
    max: { label: "$0.50 per 1,000 overage events", className: "text-gray-400" },
  };

  return (
    <div>
      {plan?.id !== "free" && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => portalMutation.mutate()}
            disabled={portalMutation.isPending}
            className="text-sm text-gray-400 hover:text-white"
          >
            {portalMutation.isPending ? "Loading..." : "Manage Billing"}
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {plansData.plans
          .filter((p) => tierOrder.includes(p.id as typeof tierOrder[number]))
          .map((p) => {
            const isCurrent = p.id === plan?.id;
            const isPro = p.id === "pro";
            const isMax = p.id === "max";
            const planTierIdx = tierOrder.indexOf(p.id as typeof tierOrder[number]);
            const isUpgrade =
              !isCurrent && p.id !== "free" && (planTierIdx === -1 || planTierIdx > currentTierIdx);
            const features = [
              `${p.eventsPerMonth.toLocaleString()} events/month`,
              `${p.rulesLimit} rules`,
              `${p.retentionDays}-day retention`,
              `${p.rateLimit} req/min`,
            ];
            const overage = overageInfo[p.id];

            return (
              <div
                key={p.id}
                className={`relative flex flex-col flex-1 min-w-0 rounded-xl p-6 transition-all ${
                  isPro
                    ? "bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-2 border-transparent scale-[1.02] shadow-lg"
                    : isMax
                    ? "bg-[var(--card)] border-2 border-purple-500/40"
                    : "bg-[var(--card)] border border-[var(--border)]"
                }`}
                style={
                  isPro
                    ? {
                        borderImage: "linear-gradient(to bottom, #3b82f6, #a855f7) 1",
                        borderImageSlice: 1,
                      }
                    : undefined
                }
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-4 text-xs font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    Current Plan
                  </span>
                )}

                <h3 className="text-lg font-semibold mt-1">{p.displayName}</h3>

                <div className="mt-3 mb-5">
                  <span className="text-3xl font-bold">${(p.priceMonthly / 100).toFixed(0)}</span>
                  <span className="text-sm text-gray-400 ml-1">/mo</span>
                </div>

                <ul className="space-y-2.5 mb-5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                      <svg
                        className="w-4 h-4 mt-0.5 shrink-0 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                  {overage && (
                    <li className={`flex items-start gap-2 text-sm ${overage.className}`}>
                      <svg
                        className="w-4 h-4 mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                        />
                      </svg>
                      {overage.label}
                    </li>
                  )}
                </ul>

                {isCurrent ? (
                  <div className="text-center text-sm text-gray-500 py-2.5">Current Plan</div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => checkoutMutation.mutate(p.id)}
                    disabled={checkoutMutation.isPending}
                    className={`w-full py-2.5 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50 ${
                      isPro
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-base py-3"
                        : "bg-purple-600 hover:bg-purple-500"
                    }`}
                  >
                    {checkoutMutation.isPending
                      ? "Redirecting..."
                      : `Upgrade to ${p.displayName}`}
                  </button>
                ) : null}
              </div>
            );
          })}
      </div>
      {checkoutMutation.isError && (
        <p className="text-xs text-red-400 mt-4">
          {checkoutMutation.error instanceof Error
            ? checkoutMutation.error.message
            : "Checkout failed"}
        </p>
      )}
    </div>
  );
}
