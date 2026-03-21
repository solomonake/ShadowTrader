import { useMemo, useState } from "react";

import { apiClient } from "../api/client";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { useApi } from "../hooks/useApi";
import type { BrokerConnectionPayload } from "../lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function initialBrokerPayload(): BrokerConnectionPayload {
  return {
    broker: "alpaca",
    is_paper: true,
    credentials: { api_key: "", api_secret: "", paper: true },
  };
}

export function Settings(): JSX.Element {
  const [payload, setPayload] = useState<BrokerConnectionPayload>(initialBrokerPayload());
  const { data: brokerStatus, loading, error, refresh } = useApi(() => apiClient.getBrokerStatus(payload.broker), [payload.broker]);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const effectivePayload = useMemo<BrokerConnectionPayload>(() => {
    if (payload.broker === "ibkr") {
      return {
        ...payload,
        credentials: {
          host: payload.credentials.host ?? "127.0.0.1",
          port: payload.credentials.port ?? (payload.is_paper ? 7497 : 7496),
          client_id: payload.credentials.client_id ?? 1,
        },
      };
    }
    if (payload.broker === "binance") {
      return {
        ...payload,
        credentials: {
          ...payload.credentials,
          testnet: payload.is_paper,
        },
      };
    }
    return {
      ...payload,
      credentials: {
        ...payload.credentials,
        paper: payload.is_paper,
      },
    };
  }, [payload]);

  function updateCredential(key: string, value: string | number | boolean) {
    setPayload((current) => ({
      ...current,
      credentials: {
        ...current.credentials,
        [key]: value,
      },
    }));
  }

  async function handleTestConnection() {
    setTesting(true);
    setMessage(null);
    try {
      const result = await apiClient.testBrokerConnection(effectivePayload);
      setMessage(result.connected ? `${result.broker} connection succeeded.` : "Connection failed.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveConnection() {
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiClient.connectBroker(effectivePayload);
      setMessage(result.connected ? `${result.broker} connection saved.` : "Unable to save broker connection.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save broker connection.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClassName = "mt-2 w-full rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-sm text-white";

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Broker Connection</h2>
            <p className="mt-2 text-sm text-slate-400">Connect Alpaca, IBKR, or Binance and validate the account before trading.</p>
          </div>
          <ConnectionStatus status={brokerStatus ?? null} />
        </div>

        <div className="mt-6 grid gap-4">
          <label className="text-sm text-slate-300">
            Broker
            <select
              className={fieldClassName}
              value={payload.broker}
              onChange={(event) =>
                setPayload({
                  broker: event.target.value as BrokerConnectionPayload["broker"],
                  is_paper: true,
                  credentials:
                    event.target.value === "ibkr"
                      ? { host: "127.0.0.1", port: 7497, client_id: 1 }
                      : event.target.value === "binance"
                        ? { api_key: "", secret_key: "", testnet: true }
                        : { api_key: "", api_secret: "", paper: true },
                })
              }
            >
              <option value="alpaca">Alpaca</option>
              <option value="ibkr">Interactive Brokers</option>
              <option value="binance">Binance</option>
            </select>
          </label>

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
            <div className="grid gap-4 md:grid-cols-3">
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
            </div>
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

          <div className="flex items-center justify-between rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
            <div>
              <div className="text-sm text-white">{payload.broker === "binance" ? "Use testnet" : "Use paper trading"}</div>
              <div className="text-xs text-slate-500">Recommended until your workflow is fully verified.</div>
            </div>
            <button
              type="button"
              onClick={() => setPayload((current) => ({ ...current, is_paper: !current.is_paper }))}
              className={`rounded-full px-4 py-2 text-sm ${payload.is_paper ? "bg-success/15 text-success" : "bg-slate-700/40 text-slate-400"}`}
            >
              {payload.is_paper ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => void handleTestConnection()} disabled={testing} className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button type="button" onClick={() => void handleSaveConnection()} disabled={saving} className="rounded-2xl border border-edge px-5 py-3 text-sm text-slate-200 disabled:opacity-60">
            {saving ? "Saving..." : "Save Connection"}
          </button>
          {message && <div className="text-sm text-slate-300">{message}</div>}
        </div>

        <div className="mt-6">
          {loading && <div className="text-sm text-slate-400">Loading broker status...</div>}
          {error && <div className="rounded-2xl border border-block/40 bg-block/10 px-4 py-3 text-sm text-block">{error}</div>}
          {brokerStatus?.snapshot && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: "Equity", value: formatCurrency(brokerStatus.snapshot.equity) },
                { label: "Cash", value: formatCurrency(brokerStatus.snapshot.cash) },
                { label: "Buying Power", value: formatCurrency(brokerStatus.snapshot.buying_power) },
                { label: "Open Positions", value: String(brokerStatus.snapshot.open_positions) },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          )}
          {brokerStatus?.error && <div className="mt-4 text-sm text-block">{brokerStatus.error}</div>}
        </div>
      </div>

      <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-white">Preferences</h2>
        <p className="mt-2 text-sm text-slate-400">Production settings for overlay behavior and theme choices.</p>
        <div className="mt-6 space-y-4">
          {[
            { label: "Alert sound", value: "Off" },
            { label: "Overlay position", value: "Bottom-right" },
            { label: "Theme", value: "Dark" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
              <span className="text-sm text-slate-300">{item.label}</span>
              <span className="text-sm font-medium text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
