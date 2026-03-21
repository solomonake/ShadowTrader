type StatusBarProps = {
  status: "connected" | "disconnected" | "reconnecting";
};

const statusMap = {
  connected: { label: "Connected", color: "#22C55E" },
  disconnected: { label: "Disconnected", color: "#EF4444" },
  reconnecting: { label: "Reconnecting", color: "#F59E0B" },
} as const;

export function StatusBar({ status }: StatusBarProps): JSX.Element | null {
  if (status === "connected") {
    return null;
  }

  const current = statusMap[status];

  return (
    <div
      style={{
        alignSelf: "flex-end",
        marginBottom: 12,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(15, 15, 15, 0.72)",
        padding: "6px 10px",
        color: "#C7CBD6",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        backdropFilter: "blur(10px)",
      }}
    >
      <span style={{ color: current.color, marginRight: 6 }}>●</span>
      {current.label}
    </div>
  );
}
