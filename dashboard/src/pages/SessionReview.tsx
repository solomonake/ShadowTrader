import { AlertFeed } from "../components/AlertFeed";
import { TradeRow } from "../components/TradeRow";
import type { AlertItem } from "../lib/types";
import { useSessions } from "../hooks/useSessions";
import { useTrades } from "../hooks/useTrades";
import { useWebSocket } from "../hooks/useWebSocket";
import { useApi } from "../hooks/useApi";
import { apiClient } from "../api/client";

export function SessionReview(): JSX.Element {
  const { todayTrades, loading: tradesLoading } = useTrades();
  const { latestSession, refresh: refreshSessions } = useSessions();
  const { data: alerts } = useApi(apiClient.getAlerts, []);
  const { alerts: liveAlerts } = useWebSocket();

  const violationsByTradeId = (alerts ?? []).reduce<Record<string, AlertItem[]>>((accumulator, alert) => {
    if (!alert.trade_id) {
      return accumulator;
    }
    accumulator[alert.trade_id] = [...(accumulator[alert.trade_id] ?? []), alert];
    return accumulator;
  }, {});

  const totalTrades = todayTrades.length;
  const wins = todayTrades.filter((trade) => Number(trade.pnl ?? 0) > 0).length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const pnl = todayTrades.reduce((sum, trade) => sum + Number(trade.pnl ?? 0), 0);
  const rulesBroken = (alerts ?? []).filter((alert) => {
    const timestamp = new Date(alert.timestamp);
    const now = new Date();
    return timestamp.toDateString() === now.toDateString();
  }).length;

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Trades", value: totalTrades },
            { label: "Win Rate", value: `${winRate.toFixed(0)}%` },
            { label: "P&L", value: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` },
            { label: "Rules Broken", value: rulesBroken },
          ].map((item) => (
            <div key={item.label} className="rounded-[24px] border border-edge bg-panel p-5 shadow-panel">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
              <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">{new Date().toLocaleDateString()}</div>
              <h2 className="mt-2 text-xl font-semibold text-white">Session Timeline</h2>
            </div>
            <div className="rounded-full border border-edge px-4 py-2 text-sm text-slate-300">
              {latestSession?.ended_at ? "Ended" : "Active"}
            </div>
          </div>

          <div className="space-y-4">
            {tradesLoading ? (
              <div className="text-slate-400">Loading trades...</div>
            ) : totalTrades === 0 ? (
              <div className="rounded-2xl border border-dashed border-edge px-4 py-8 text-sm text-slate-500">
                No trades recorded today.
              </div>
            ) : (
              todayTrades.map((trade) => <TradeRow key={trade.id} trade={trade} violations={violationsByTradeId[trade.id] ?? []} />)
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Daily Summary</h3>
              <p className="mt-1 text-sm text-slate-400">Narrative review of today’s session with reflection questions.</p>
            </div>
            {!latestSession?.summary && (
              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    await apiClient.generateSessionSummary();
                    await refreshSessions();
                  })()
                }
                className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white"
              >
                Generate Summary
              </button>
            )}
          </div>
          {latestSession?.summary ? (
            <div className="rounded-2xl border border-edge bg-[#11141D] px-4 py-4 text-sm leading-7 text-slate-200 whitespace-pre-wrap">
              {latestSession.summary}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-edge px-4 py-8 text-sm text-slate-500">
              No summary yet. Generate one after the session to capture what happened and what to reflect on.
            </div>
          )}
        </div>
      </div>

      <AlertFeed alerts={liveAlerts} />
    </section>
  );
}
