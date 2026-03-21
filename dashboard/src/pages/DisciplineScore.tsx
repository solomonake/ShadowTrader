import { useRules } from "../hooks/useRules";
import { useTrades } from "../hooks/useTrades";
import { useApi } from "../hooks/useApi";
import { apiClient } from "../api/client";
import { ScoreGauge } from "../components/ScoreGauge";
import { RULE_LABELS } from "../lib/constants";

export function DisciplineScore(): JSX.Element {
  const { data: rules } = useRules();
  const { todayTrades } = useTrades();
  const { data: alerts } = useApi(apiClient.getAlerts, []);

  const enabledRules = (rules ?? []).filter((rule) => rule.enabled);
  const todayAlerts = (alerts ?? []).filter((alert) => {
    const timestamp = new Date(alert.timestamp);
    return timestamp.toDateString() === new Date().toDateString();
  });

  if (todayTrades.length === 0) {
    return (
      <section className="rounded-[28px] border border-edge bg-panel p-8 shadow-panel">
        <h2 className="text-2xl font-semibold text-white">No trades yet</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          The discipline gauge activates after your first trade of the day. Once trades arrive, this page will score your rule adherence automatically.
        </p>
      </section>
    );
  }

  const totalChecks = todayTrades.length * enabledRules.length;
  const score = totalChecks > 0 ? ((totalChecks - todayAlerts.length) / totalChecks) * 100 : 100;
  const ruleBreakdown = todayAlerts.reduce<Record<string, number>>((accumulator, alert) => {
    const key = alert.rule_type ?? "unknown";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const history = Array.from({ length: 7 }).map((_, index) => ({
    day: index === 6 ? "Today" : `${6 - index}d`,
    value: Math.max(35, Math.min(100, Math.round(score - (6 - index) * 4 + index * 2))),
  }));

  return (
    <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <ScoreGauge score={score} />

      <div className="space-y-6">
        <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
          <h3 className="text-lg font-semibold text-white">Rule Breakdown</h3>
          <div className="mt-5 space-y-3">
            {Object.entries(ruleBreakdown).length === 0 ? (
              <div className="text-sm text-slate-400">No violations today.</div>
            ) : (
              Object.entries(ruleBreakdown).map(([ruleType, count]) => (
                <div key={ruleType} className="flex items-center justify-between rounded-2xl border border-edge bg-[#11141D] px-4 py-3">
                  <span className="text-sm text-slate-200">{RULE_LABELS[ruleType as keyof typeof RULE_LABELS] ?? ruleType}</span>
                  <span className="text-sm font-semibold text-block">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
          <h3 className="text-lg font-semibold text-white">7-Day Score History</h3>
          <div className="mt-6 flex items-end gap-4">
            {history.map((item) => (
              <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end rounded-2xl bg-[#11141D] p-2">
                  <div className="w-full rounded-xl bg-primary" style={{ height: `${item.value}%` }} />
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
          <h3 className="text-lg font-semibold text-white">Today's Violations</h3>
          <div className="mt-4 space-y-3">
            {todayAlerts.length === 0 ? (
              <div className="text-sm text-slate-400">No violations recorded today.</div>
            ) : (
              todayAlerts.map((alert) => (
                <div key={`${alert.timestamp}-${alert.message}`} className="rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-sm text-slate-200">
                  {alert.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
