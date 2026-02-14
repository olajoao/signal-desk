"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getWsTicket } from "@/lib/auth";

interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

type MessageHandler = (message: WsMessage) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws";

export function useWebSocket(isAuthenticated: boolean, onMessage: MessageHandler, onAuthError?: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const connect = useCallback(async () => {
    if (!isAuthenticated) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    // Get short-lived ticket (30s TTL) instead of leaking JWT in URL
    let ticket: string;
    try {
      const res = await getWsTicket();
      ticket = res.ticket;
    } catch {
      reconnectTimeoutRef.current = setTimeout(() => { connect(); }, 3000);
      return;
    }

    const url = `${WS_URL}?token=${encodeURIComponent(ticket)}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        onMessage(message);
      } catch {
        // ignore invalid messages
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (event.code === 4401 && onAuthError) {
        onAuthError();
        return;
      }
      reconnectTimeoutRef.current = setTimeout(() => { connect(); }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [isAuthenticated, onMessage, onAuthError]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws.close();
        } else {
          ws.close();
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
