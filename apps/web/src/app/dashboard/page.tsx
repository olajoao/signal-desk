"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getEvents,
  getUsage,
  getRules,
  getNotifications,
  type EventItem,
  type NotificationItem,
} from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/components/auth-provider";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

interface LiveNotification {
  notificationId: string;
  ruleName: string;
  eventType: string;
  channel: string;
  count: number;
  threshold: number;
  windowSeconds: number;
  triggeredAt: string;
}

interface MergedNotification {
  id: string;
  ruleName: string;
  eventType: string;
  channel: string;
  count: number | null;
  threshold: number | null;
  windowSeconds: number | null;
  time: string;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "primary" | "success" | "warning";
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-semibold text-[var(--${accent})]`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, refreshAuth } = useAuth();
  const queryClient = useQueryClient();
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);
  const [typeFilter, setTypeFilter] = useState("");

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", user?.id],
    queryFn: () => getEvents({ limit: 50 }),
    enabled: !!user,
  });

  const { data: usageData } = useQuery({
    queryKey: ["usage", user?.id],
    queryFn: () => getUsage(),
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: rulesData } = useQuery({
    queryKey: ["rules", user?.id],
    queryFn: () => getRules(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotifications({ limit: 50 }),
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const handleMessage = useCallback(
    (message: { type: string; payload: Record<string, unknown> }) => {
      if (message.type === "event:new") {
        const event = message.payload as unknown as EventItem;
        setLiveEvents((prev) => [event, ...prev].slice(0, 20));
      }
      if (message.type === "notification:new") {
        const notification = message.payload as unknown as LiveNotification;
        setLiveNotifications((prev) => [notification, ...prev].slice(0, 10));
      }
    },
    []
  );

  const { isConnected } = useWebSocket(!!user, handleMessage, refreshAuth);

  // Invalidate queries when new live notifications arrive
  useEffect(() => {
    if (liveNotifications.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
    }
  }, [liveNotifications.length, queryClient, user?.id]);

  // Dedup events
  const allEvents = useMemo(() => {
    const seen = new Set<string>();
    const merged: EventItem[] = [];
    for (const event of [...liveEvents, ...(eventsData?.events ?? [])]) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        merged.push(event);
      }
    }
    return merged;
  }, [liveEvents, eventsData]);

  // Derive event types for filter
  const allEventTypes = useMemo(
    () => [...new Set(allEvents.map((e) => e.type))].sort(),
    [allEvents]
  );

  const filteredEvents = typeFilter
    ? allEvents.filter((e) => e.type === typeFilter)
    : allEvents;

  // Merge API + live notifications, dedup
  const mergedNotifications = useMemo(() => {
    const apiMapped: MergedNotification[] = (notificationsData?.notifications ?? []).map(
      (n: NotificationItem) => ({
        id: n.id,
        ruleName: n.ruleName,
        eventType: n.eventType,
        channel: n.channel,
        count: null,
        threshold: null,
        windowSeconds: null,
        time: n.sentAt ?? n.createdAt,
      })
    );

    const liveMapped: MergedNotification[] = liveNotifications.map((n) => ({
      id: n.notificationId,
      ruleName: n.ruleName,
      eventType: n.eventType,
      channel: n.channel,
      count: n.count,
      threshold: n.threshold,
      windowSeconds: n.windowSeconds,
      time: n.triggeredAt,
    }));

    const seen = new Set<string>();
    const merged: MergedNotification[] = [];
    for (const n of [...liveMapped, ...apiMapped]) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        merged.push(n);
      }
    }
    return merged;
  }, [liveNotifications, notificationsData]);

  if (authLoading || !user) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const activeRules = rulesData?.rules.filter((r) => r.enabled).length ?? 0;
  const eventsUsed = usageData?.usage.events.used ?? "—";
  const notifCount = notificationsData?.notifications.length ?? "—";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-[var(--success)]" : "bg-[var(--error)]"}`}
          />
          <span className="text-sm text-gray-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Usage Warning Banners */}
      {usageData && usageData.usage.events.percentUsed >= 80 && (
        <div
          className={`rounded-lg p-3 mb-6 text-sm ${
            usageData.usage.events.percentUsed >= 100
              ? "bg-red-500/10 border border-red-500/20 text-red-400"
              : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
          }`}
        >
          {usageData.usage.events.percentUsed >= 100 ? (
            <span>
              Event limit reached ({usageData.usage.events.limit.toLocaleString()}).{" "}
              <a href="/settings" className="underline font-medium">Upgrade your plan</a> to continue.
            </span>
          ) : (
            <span>
              {usageData.usage.events.remaining.toLocaleString()} events remaining this month ({usageData.usage.events.percentUsed}% used).
            </span>
          )}
        </div>
      )}

      {/* Onboarding */}
      <OnboardingChecklist
        hasApiKey={(eventsData?.events.length ?? 0) > 0 || liveEvents.length > 0}
        hasRule={(rulesData?.rules.length ?? 0) > 0}
        hasEvent={(eventsData?.events.length ?? 0) > 0 || liveEvents.length > 0}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Events (period)" value={eventsUsed} accent="primary" />
        <StatCard label="Active Rules" value={activeRules} accent="success" />
        <StatCard label="Notifications" value={notifCount} accent="warning" />
      </div>

      {/* Recent Alerts */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg mb-6">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">Recent Alerts</h2>
        </div>
        {mergedNotifications.length === 0 ? (
          <div className="p-4 text-gray-400">No alerts yet.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {mergedNotifications.slice(0, 10).map((n) => (
              <div key={n.id} className="p-4 hover:bg-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{n.ruleName}</span>
                  <span className="font-mono text-xs bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-0.5 rounded shrink-0">
                    {n.eventType}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-sm text-gray-400">
                  {n.count != null && n.threshold != null && (
                    <span>
                      {n.count}/{n.threshold}
                      {n.windowSeconds != null && (
                        <span className="text-gray-500"> in {n.windowSeconds}s</span>
                      )}
                    </span>
                  )}
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{n.channel}</span>
                  <span className="text-xs text-gray-500">{timeAgo(n.time)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Events */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-medium">Live Events</h2>
          {allEventTypes.length > 1 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-gray-300"
            >
              <option value="">All types</option>
              {allEventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        {eventsLoading ? (
          <div className="p-4 text-gray-400">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-4 text-gray-400">
            {typeFilter ? "No events matching this type." : "No events yet. Send some events to see them here."}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredEvents.slice(0, 50).map((event) => (
              <div key={event.id} className="p-4 hover:bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-0.5 rounded">
                    {event.type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs text-gray-400 overflow-x-auto">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
