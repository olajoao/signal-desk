"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface WsMessage {
  type: string;
  payload: Record<string, unknown>;
}

type MessageHandler = (message: WsMessage) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001/ws";

export function useWebSocket(token: string | null, onMessage: MessageHandler, onAuthError?: () => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
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
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [token, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { isConnected };
}
