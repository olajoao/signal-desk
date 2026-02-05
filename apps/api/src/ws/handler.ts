import type { WebSocket } from "ws";

interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket) {
  clients.add(ws);

  ws.on("close", () => {
    clients.delete(ws);
  });

  ws.on("error", () => {
    clients.delete(ws);
  });

  // Send connection confirmation
  ws.send(JSON.stringify({ type: "connected", payload: { clientCount: clients.size } }));
}

export function broadcast(message: WsMessage) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

export function getClientCount(): number {
  return clients.size;
}
