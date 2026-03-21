import { BROKER_OPTIONS } from "../../lib/constants";
import type { BrokerConnectionPayload } from "../../lib/types";

export function StepCredentials({
  payload,
  onChange,
}: {
  payload: BrokerConnectionPayload;
  onChange: (next: BrokerConnectionPayload) => void;
}): JSX.Element {
  const docsUrl = BROKER_OPTIONS.find((item) => item.value === payload.broker)?.docsUrl ?? "#";
  const fieldClassName = "mt-2 w-full rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-sm text-white";

  function updateCredential(key: string, value: string | number | boolean) {
    onChange({
      ...payload,
      credentials: {
        ...payload.credentials,
        [key]: value,
      },
    });
  }

  return (
    <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Enter API Credentials</h3>
          <p className="mt-2 text-sm text-slate-400">Paper/testnet mode is recommended for setup and early testing.</p>
        </div>
        <a href={docsUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-edge px-4 py-3 text-sm text-slate-200">
          How to get keys
        </a>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {payload.broker === "alpaca" && (
          <>
            <label className="text-sm text-slate-300">
              API Key
              <input className={fieldClassName} value={String(payload.credentials.api_key ?? "")} onChange={(event) => updateCredential("api_key", event.target.value)} />
            </label>
            <label className="text-sm text-slate-300">
              Secret Key
              <input className={fieldClassName} type="password" value={String(payload.credentials.api_secret ?? "")} onChange={(event) => updateCredential("api_secret", event.target.value)} />
            </label>
          </>
        )}
        {payload.broker === "ibkr" && (
          <>
            <label className="text-sm text-slate-300">
              Host
              <input className={fieldClassName} value={String(payload.credentials.host ?? "127.0.0.1")} onChange={(event) => updateCredential("host", event.target.value)} />
            </label>
            <label className="text-sm text-slate-300">
              Port
              <input className={fieldClassName} type="number" value={String(payload.credentials.port ?? 7497)} onChange={(event) => updateCredential("port", Number(event.target.value))} />
            </label>
            <label className="text-sm text-slate-300">
              Client ID
              <input className={fieldClassName} type="number" value={String(payload.credentials.client_id ?? 1)} onChange={(event) => updateCredential("client_id", Number(event.target.value))} />
            </label>
          </>
        )}
        {payload.broker === "binance" && (
          <>
            <label className="text-sm text-slate-300">
              API Key
              <input className={fieldClassName} value={String(payload.credentials.api_key ?? "")} onChange={(event) => updateCredential("api_key", event.target.value)} />
            </label>
            <label className="text-sm text-slate-300">
              Secret Key
              <input className={fieldClassName} type="password" value={String(payload.credentials.secret_key ?? "")} onChange={(event) => updateCredential("secret_key", event.target.value)} />
            </label>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
        <div>
          <div className="text-sm text-white">{payload.broker === "binance" ? "Use testnet" : "Use paper trading"}</div>
          <div className="text-xs text-slate-500">Keep this enabled until you have validated the full workflow.</div>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...payload, is_paper: !payload.is_paper })}
          className={`rounded-full px-4 py-2 text-sm ${payload.is_paper ? "bg-success/15 text-success" : "bg-slate-700/40 text-slate-400"}`}
        >
          {payload.is_paper ? "Enabled" : "Disabled"}
        </button>
      </div>
    </div>
  );
}
