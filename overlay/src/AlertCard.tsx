import type { OverlayAlert } from "./ws-client";

type AlertCardProps = {
  alert: OverlayAlert;
  fadingOut: boolean;
};

const severityStyles = {
  warn: { accent: "#F59E0B", label: "Warn" },
  block: { accent: "#EF4444", label: "Block" },
  log: { accent: "#6B7280", label: "Log" },
} as const;

export function AlertCard({ alert, fadingOut }: AlertCardProps): JSX.Element {
  const theme = severityStyles[alert.severity];
  const label = alert.type === "pattern_alert" ? alert.pattern_type : alert.rule_type;

  return (
    <article
      style={{
        width: 340,
        borderRadius: 8,
        borderLeft: `3px solid ${theme.accent}`,
        background: "rgba(15, 15, 15, 0.92)",
        padding: "12px 16px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
        color: "#F3F4F6",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
        opacity: fadingOut ? 0 : 1,
        transform: `translateY(${fadingOut ? 12 : 0}px)`,
        transition: "opacity 300ms ease, transform 300ms ease",
      }}
    >
      <div
        style={{
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: theme.accent,
        }}
      >
        {theme.label}
      </div>
      <div style={{ marginBottom: 8 }}>{alert.message}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#9CA3AF",
          fontSize: 11,
        }}
      >
        <span>{label ? label.replaceAll("_", " ") : alert.type}</span>
        <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
      </div>
    </article>
  );
}
