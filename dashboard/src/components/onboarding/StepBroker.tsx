import { BROKER_OPTIONS } from "../../lib/constants";

export function StepBroker({
  selectedBroker,
  onSelect,
}: {
  selectedBroker: "alpaca" | "ibkr" | "binance";
  onSelect: (broker: "alpaca" | "ibkr" | "binance") => void;
}): JSX.Element {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {BROKER_OPTIONS.map((broker) => (
        <button
          key={broker.value}
          type="button"
          onClick={() => onSelect(broker.value)}
          className={`rounded-[24px] border p-5 text-left shadow-panel ${
            selectedBroker === broker.value ? "border-primary/40 bg-primary/10" : "border-edge bg-panel"
          }`}
        >
          <div className="text-lg font-semibold text-white">{broker.label}</div>
          <div className="mt-2 text-sm text-slate-400">{broker.markets}</div>
          <div className="mt-4 text-xs uppercase tracking-[0.18em] text-primary">{broker.paperLabel}</div>
        </button>
      ))}
    </div>
  );
}
