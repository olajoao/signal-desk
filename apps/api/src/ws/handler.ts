import type { WebSocket } from "ws";
import Redis from "ioredis";

interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

const orgClients = new Map<string, Set<WebSocket>>();

const subscriber = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

subscriber.on("message", (channel, message) => {
  const orgId = channel.replace("ws:broadcast:", "");
  try {
    const parsed = JSON.parse(message) as WsMessage;
    broadcast(orgId, parsed);
  } catch {
    // ignore malformed messages
  }
});

export function addClient(orgId: string, ws: WebSocket) {
  let clients = orgClients.get(orgId);
  if (!clients) {
    clients = new Set();
    orgClients.set(orgId, clients);
    subscriber.subscribe(`ws:broadcast:${orgId}`);
  }
  clients.add(ws);

  const cleanup = () => {
    clients.delete(ws);
    if (clients.size === 0) {
      orgClients.delete(orgId);
      subscriber.unsubscribe(`ws:broadcast:${orgId}`);
    }
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);

  ws.send(JSON.stringify({ type: "connected", payload: {} }));
}

export function broadcast(orgId: string, message: WsMessage) {
  const clients = orgClients.get(orgId);
  if (!clients) return;

  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

export function getClientCount(): number {
  let count = 0;
  for (const clients of orgClients.values()) {
    count += clients.size;
  }
  return count;
}
