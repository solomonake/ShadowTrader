import { useEffect, useState } from "react";

import { AlertCard } from "./AlertCard";
import type { OverlayAlert } from "./ws-client";

type ManagedAlert = OverlayAlert & {
  fadingOut: boolean;
};

type AlertStackProps = {
  incomingAlert: OverlayAlert | null;
  onHoverChange: (interactive: boolean) => void;
};

const DISPLAY_LIMIT = 4;
const DISPLAY_DURATION_MS = 8000;
const FADE_DURATION_MS = 300;

export function AlertStack({ incomingAlert, onHoverChange }: AlertStackProps): JSX.Element {
  const [alerts, setAlerts] = useState<ManagedAlert[]>([]);

  useEffect(() => {
    if (!incomingAlert) {
      return;
    }

    setAlerts((current) => {
      const next = [...current, { ...incomingAlert, fadingOut: false }];
      if (next.length <= DISPLAY_LIMIT) {
        return next;
      }
      const [oldest, ...rest] = next;
      return [{ ...oldest, fadingOut: true }, ...rest].slice(0, DISPLAY_LIMIT);
    });

    const fadeTimer = window.setTimeout(() => {
      setAlerts((current) =>
        current.map((item) => (item.id === incomingAlert.id ? { ...item, fadingOut: true } : item)),
      );
    }, DISPLAY_DURATION_MS);

    const removeTimer = window.setTimeout(() => {
      setAlerts((current) => current.filter((item) => item.id !== incomingAlert.id));
    }, DISPLAY_DURATION_MS + FADE_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [incomingAlert]);

  useEffect(() => {
    const fadingIds = alerts.filter((item) => item.fadingOut).map((item) => item.id);
    if (fadingIds.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setAlerts((current) => current.filter((item) => !fadingIds.includes(item.id)));
    }, FADE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [alerts]);

  return (
    <section
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      style={{
        display: "flex",
        minHeight: 0,
        flexDirection: "column",
        justifyContent: "flex-end",
        gap: 8,
        pointerEvents: "auto",
      }}
    >
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} fadingOut={alert.fadingOut} />
      ))}
    </section>
  );
}
