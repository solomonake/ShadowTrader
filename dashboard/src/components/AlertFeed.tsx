import type { AlertItem } from "../lib/types";

export function AlertFeed({ alerts }: { alerts: AlertItem[] }): JSX.Element {
  return (
    <section className="rounded-[28px] border border-edge bg-panel p-5 shadow-panel">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Live Alert Feed</h3>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{alerts.length} recent</span>
      </div>
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge px-4 py-8 text-sm text-slate-500">
            No live alerts yet.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id ?? `${alert.timestamp}-${alert.message}`} className="rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                <span>{alert.pattern_type ?? alert.rule_type ?? alert.severity}</span>
                <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="mt-3 text-sm text-slate-100">{alert.message}</p>
              {typeof alert.confidence === "number" && (
                <div className="mt-2 text-xs text-slate-500">Confidence {Math.round(alert.confidence * 100)}%</div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
