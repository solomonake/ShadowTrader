import type { AlertItem, Trade } from "../lib/types";

type TradeRowProps = {
  trade: Trade;
  violations: AlertItem[];
};

export function TradeRow({ trade, violations }: TradeRowProps): JSX.Element {
  const pnlValue = Number(trade.pnl ?? 0);
  const pnlClass = pnlValue >= 0 ? "text-success" : "text-block";

  return (
    <div className="rounded-2xl border border-edge bg-panel/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
            {new Date(trade.timestamp).toLocaleTimeString()}
          </div>
          <div className="mt-2 text-base font-semibold text-white">
            {trade.symbol} <span className="text-slate-400">{trade.side.toUpperCase()}</span>
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Qty {trade.quantity} at ${trade.price}
          </div>
        </div>
        <div className={`text-lg font-semibold ${pnlClass}`}>
          {pnlValue >= 0 ? "+" : ""}${pnlValue.toFixed(2)}
        </div>
      </div>
      {violations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {violations.map((violation) => (
            <div
              key={`${trade.id}-${violation.timestamp}-${violation.message}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                violation.severity === "block" ? "border-block/40 bg-block/10 text-block" : "border-warn/40 bg-warn/10 text-warn"
              }`}
              title={violation.message}
            >
              {violation.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
