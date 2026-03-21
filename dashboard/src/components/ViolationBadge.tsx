import type { AlertItem } from "../lib/types";

export function ViolationBadge({ violation }: { violation: AlertItem }): JSX.Element {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        violation.severity === "block" ? "border-block/40 bg-block/10 text-block" : "border-warn/40 bg-warn/10 text-warn"
      }`}
      title={violation.message}
    >
      {violation.severity}
    </span>
  );
}
