"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

export default function NotificationsPage() {
  const { token, isLoading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", token],
    queryFn: () => (token ? getNotifications(token, { limit: 100 }) : Promise.resolve({ notifications: [] })),
    enabled: !!token,
    refetchInterval: 10000,
  });

  if (authLoading || !token) return <div className="text-gray-400">Loading...</div>;

  const statusColors: Record<string, string> = {
    sent: "bg-[var(--success)]",
    pending: "bg-[var(--warning)]",
    failed: "bg-[var(--error)]",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Notifications</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
        {isLoading ? (
          <div className="p-4 text-gray-400">Loading notifications...</div>
        ) : data?.notifications.length === 0 ? (
          <div className="p-4 text-gray-400">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {data?.notifications.map((notification) => (
              <div key={notification.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${statusColors[notification.status] ?? "bg-gray-500"}`}
                    />
                    <span className="font-medium">{notification.ruleName}</span>
                    <span className="text-sm text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                      {notification.channel}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  Triggered by{" "}
                  <span className="text-[var(--primary)]">{notification.eventType}</span> event
                </div>
                {notification.error && (
                  <div className="mt-2 text-sm text-[var(--error)]">{notification.error}</div>
                )}
                {notification.sentAt && (
                  <div className="mt-1 text-xs text-gray-500">
                    Sent at {new Date(notification.sentAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
