"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { getEvents, type EventItem } from "@/lib/api";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/components/auth-provider";

export default function DashboardPage() {
  const { token, isLoading: authLoading, refreshAuth } = useAuth();
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["events", token],
    queryFn: () => (token ? getEvents(token, { limit: 50 }) : Promise.resolve({ events: [] })),
    enabled: !!token,
  });

  const handleMessage = useCallback((message: { type: string; payload: Record<string, unknown> }) => {
    if (message.type === "event:new") {
      const event = message.payload as unknown as EventItem;
      setLiveEvents((prev) => [event, ...prev].slice(0, 20));
    }
  }, []);

  const { isConnected } = useWebSocket(token, handleMessage, refreshAuth);

  if (authLoading || !token) {
    return <div className="text-gray-400">Loading...</div>;
  }

  const allEvents = [...liveEvents, ...(data?.events ?? [])].reduce<EventItem[]>(
    (acc, event) => {
      if (!acc.find((e) => e.id === event.id)) {
        acc.push(event);
      }
      return acc;
    },
    []
  );

  return (
    <div>
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

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="font-medium">Live Events</h2>
        </div>

        {isLoading ? (
          <div className="p-4 text-gray-400">Loading events...</div>
        ) : allEvents.length === 0 ? (
          <div className="p-4 text-gray-400">No events yet. Send some events to see them here.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {allEvents.slice(0, 50).map((event) => (
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
