import { useEffect, useState } from "react";

import { WS_URL } from "../lib/constants";
import type { AlertItem } from "../lib/types";

type ConnectionState = "connected" | "disconnected" | "reconnecting";

export function useWebSocket(): {
  alerts: AlertItem[];
  status: ConnectionState;
} {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [status, setStatus] = useState<ConnectionState>("disconnected");

  useEffect(() => {
    let closedManually = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let attempts = 0;

    const connect = () => {
      setStatus(attempts === 0 ? "disconnected" : "reconnecting");
      socket = new WebSocket(WS_URL);

      socket.addEventListener("open", () => {
        attempts = 0;
        setStatus("connected");
      });

      socket.addEventListener("message", (event) => {
        try {
          const parsed = JSON.parse(event.data) as AlertItem;
          setAlerts((current) => [{ ...parsed, id: crypto.randomUUID() }, ...current].slice(0, 20));
        } catch {
          return;
        }
      });

      socket.addEventListener("close", () => {
        if (closedManually) {
          return;
        }
        attempts += 1;
        setStatus("reconnecting");
        const delay = Math.min(1000 * 2 ** (attempts - 1), 30000);
        reconnectTimer = window.setTimeout(connect, delay);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    };

    connect();

    return () => {
      closedManually = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
      setStatus("disconnected");
    };
  }, []);

  return { alerts, status };
}
