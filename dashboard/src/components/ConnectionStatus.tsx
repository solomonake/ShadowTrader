import type { BrokerStatus } from "../lib/types";

export function ConnectionStatus({ status }: { status: BrokerStatus | null }): JSX.Element {
  const connected = status?.connected ?? false;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-edge bg-[#11141D] px-4 py-3">
      <span className={`text-sm ${connected ? "text-success" : "text-block"}`}>●</span>
      <div>
        <div className="text-sm font-medium text-white">{connected ? "Connected" : "Disconnected"}</div>
        <div className="text-xs text-slate-500">{status ? `${status.broker.toUpperCase()} ${status.is_paper ? "Paper" : "Live"}` : "Broker unavailable"}</div>
      </div>
    </div>
  );
}
