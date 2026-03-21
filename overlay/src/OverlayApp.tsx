import { useEffect, useState } from "react";

import { AlertStack } from "./AlertStack";
import { StatusBar } from "./StatusBar";
import { OverlayWebSocketClient, type OverlayAlert, type OverlayConnectionStatus } from "./ws-client";

const WS_URL = import.meta.env.VITE_SHADOWTRADER_WS_URL ?? "ws://localhost:8000/ws/alerts";

declare global {
  interface Window {
    overlayAPI?: {
      setMousePassthrough: (enabled: boolean) => void;
      setConnectionStatus: (status: OverlayConnectionStatus) => void;
    };
  }
}

export function OverlayApp(): JSX.Element {
  const [latestAlert, setLatestAlert] = useState<OverlayAlert | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<OverlayConnectionStatus>("disconnected");

  useEffect(() => {
    const client = new OverlayWebSocketClient({
      url: WS_URL,
      onAlert: (alert) => setLatestAlert(alert),
      onStatusChange: (status) => {
        setConnectionStatus(status);
        window.overlayAPI?.setConnectionStatus(status);
      },
    });
    client.connect();
    return () => client.disconnect();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-end",
        padding: 20,
        background: "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 340,
          minHeight: 460,
          flexDirection: "column",
          justifyContent: "flex-end",
          pointerEvents: "none",
        }}
      >
        <StatusBar status={connectionStatus} />
        <AlertStack
          incomingAlert={latestAlert}
          onHoverChange={(interactive) => window.overlayAPI?.setMousePassthrough(!interactive)}
        />
      </div>
    </main>
  );
}
