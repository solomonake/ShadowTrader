export type OverlayConnectionStatus = "connected" | "disconnected" | "reconnecting";

export type OverlayAlert = {
  id: string;
  type: string;
  severity: "warn" | "block" | "log";
  rule_type?: string;
  pattern_type?: string;
  message: string;
  timestamp: string;
  trade_id?: string | null;
  confidence?: number | null;
};

type ClientOptions = {
  url: string;
  onAlert: (alert: OverlayAlert) => void;
  onStatusChange: (status: OverlayConnectionStatus) => void;
};

export class OverlayWebSocketClient {
  private readonly url: string;
  private readonly onAlert: (alert: OverlayAlert) => void;
  private readonly onStatusChange: (status: OverlayConnectionStatus) => void;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private socket: WebSocket | null = null;
  private closedManually = false;

  public constructor(options: ClientOptions) {
    this.url = options.url;
    this.onAlert = options.onAlert;
    this.onStatusChange = options.onStatusChange;
  }

  public connect(): void {
    this.closedManually = false;
    this.openSocket();
  }

  public disconnect(): void {
    this.closedManually = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.onStatusChange("disconnected");
  }

  private openSocket(): void {
    this.onStatusChange(this.reconnectAttempts === 0 ? "disconnected" : "reconnecting");
    this.socket = new WebSocket(this.url);

    this.socket.addEventListener("open", () => {
      this.reconnectAttempts = 0;
      this.onStatusChange("connected");
    });

    this.socket.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(event.data) as Omit<OverlayAlert, "id">;
        this.onAlert({
          ...parsed,
          id: `${parsed.timestamp}-${crypto.randomUUID()}`,
        });
      } catch {
        return;
      }
    });

    this.socket.addEventListener("close", () => {
      this.socket = null;
      if (!this.closedManually) {
        this.scheduleReconnect();
      }
    });

    this.socket.addEventListener("error", () => {
      this.socket?.close();
    });
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts += 1;
    this.onStatusChange("reconnecting");
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30000);
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket();
    }, delay);
  }
}
