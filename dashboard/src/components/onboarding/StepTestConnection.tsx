import type { BrokerStatus } from "../../lib/types";

export function StepTestConnection({
  testing,
  result,
  error,
  onTest,
}: {
  testing: boolean;
  result: BrokerStatus | null;
  error: string | null;
  onTest: () => Promise<void>;
}): JSX.Element {
  return (
    <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
      <h3 className="text-lg font-semibold text-white">Test Connection</h3>
      <p className="mt-2 text-sm text-slate-400">Validate the connection before saving it and applying your template.</p>
      <button type="button" onClick={() => void onTest()} disabled={testing} className="mt-5 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
        {testing ? "Testing..." : "Test Connection"}
      </button>
      {error && <div className="mt-4 rounded-2xl border border-block/30 bg-block/10 px-4 py-3 text-sm text-block">{error}</div>}
      {result?.connected && result.snapshot && (
        <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 px-4 py-4">
          <div className="text-sm font-medium text-success">Connection successful</div>
          <div className="mt-2 text-sm text-slate-200">Equity ${result.snapshot.equity.toFixed(2)} • Cash ${result.snapshot.cash.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}
