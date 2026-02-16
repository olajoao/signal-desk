"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getNotifications } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

const PAGE_SIZE = 25;

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page, statusFilter],
    queryFn: () =>
      getNotifications({
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
      }),
    enabled: !!user,
    refetchInterval: 10000,
  });

  if (authLoading || !user) return <div className="text-[var(--muted)]">Loading...</div>;

  const statusColors: Record<string, string> = {
    sent: "bg-[var(--success)]",
    pending: "bg-[var(--warning)]",
    failed: "bg-[var(--error)]",
  };

  const notifications = data?.notifications ?? [];
  const hasMore = notifications.length === PAGE_SIZE;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="text-sm bg-[var(--background)] border border-[var(--border)] rounded-none font-mono px-2 py-1"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded">
        {isLoading ? (
          <div className="p-4 text-[var(--muted)]">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-[var(--muted)]">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${statusColors[notification.status] ?? "bg-[var(--dim)]"}`}
                    />
                    <span className="font-medium">{notification.ruleName}</span>
                    <span className="text-sm text-[var(--dim)] bg-white/5 px-2 py-0.5 rounded-none font-mono">
                      {notification.channel}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--dim)] font-mono">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-[var(--muted)]">
                  Triggered by{" "}
                  <span className="text-[var(--accent)] font-mono">{notification.eventType}</span> event
                </div>
                {notification.error && (
                  <div className="mt-2 text-sm text-[var(--error)]">{notification.error}</div>
                )}
                {notification.sentAt && (
                  <div className="mt-1 text-xs text-[var(--dim)]">
                    Sent at {new Date(notification.sentAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm border border-[var(--border)] rounded-none disabled:opacity-30 hover:bg-white/5"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--muted)] font-mono">Page {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="px-3 py-1 text-sm border border-[var(--border)] rounded-none disabled:opacity-30 hover:bg-white/5"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
