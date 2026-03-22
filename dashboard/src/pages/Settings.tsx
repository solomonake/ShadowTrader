import { AlertCircle, CheckCircle2, RefreshCw, Unlink, Zap } from "lucide-react";
import { useMemo, useState } from "react";

import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";
import type { BrokerConnectionPayload } from "../lib/types";

type Tab = "brokers" | "preferences" | "account";

/* ─── helpers ─────────────────────────────────────────────── */
function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatRelativeTime(iso?: string) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min === 1) return "1 minute ago";
  if (min < 60) return `${min} minutes ago`;
  const hr = Math.floor(min / 60);
  return `${hr} hour${hr === 1 ? "" : "s"} ago`;
}

function initialBrokerPayload(): BrokerConnectionPayload {
  return { broker: "alpaca", is_paper: true, credentials: { api_key: "", api_secret: "", paper: true } };
}

const inputClass =
  "mt-2 w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-4 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60";

/* ─── BrokerCard ──────────────────────────────────────────── */
function BrokerCard({
  broker,
  onRefresh,
}: {
  broker: string;
  onRefresh: () => void;
}) {
  const { data, loading, error, refresh } = useApi(
    () => apiClient.getBrokerStatus(broker),
    [broker],
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const lastSynced = new Date().toISOString(); // placeholder — real data from status

  async function handleRefresh() {
    await refresh();
    onRefresh();
  }

  const connected = data?.connected ?? false;
  const brokerLabel =
    broker === "alpaca" ? "Alpaca Markets" : broker === "ibkr" ? "Interactive Brokers" : "Binance";

  return (
    <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-5 transition hover:border-[#363A47]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F1117]">
            <Zap size={18} className="text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-white">{brokerLabel}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              {loading ? (
                <span>Checking…</span>
              ) : connected ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  <span className="text-green-400">Connected</span>
                  <span>·</span>
                  <span>{data?.is_paper ? "Paper Trading" : "Live"}</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  <span className="text-red-400">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            title="Refresh"
            className="rounded-lg border border-[#2A2D37] p-2 text-slate-500 transition hover:border-[#363A47] hover:text-white"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {connected && data?.snapshot && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            { label: "Equity", value: formatCurrency(data.snapshot.equity) },
            { label: "Cash", value: formatCurrency(data.snapshot.cash) },
            { label: "Buying Power", value: formatCurrency(data.snapshot.buying_power) },
            { label: "Open Positions", value: String(data.snapshot.open_positions) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-[#0F1117] px-3 py-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-600">{item.label}</div>
              <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-600">Last synced: {formatRelativeTime(lastSynced)}</div>
        <button
          type="button"
          disabled={disconnecting || !connected}
          className="flex items-center gap-1.5 rounded-lg border border-[#2A2D37] px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-500/30 hover:text-red-400 disabled:opacity-40"
        >
          <Unlink size={11} />
          Disconnect
        </button>
      </div>
    </div>
  );
}

/* ─── Add broker form ─────────────────────────────────────── */
function AddBrokerForm() {
  const [payload, setPayload] = useState<BrokerConnectionPayload>(initialBrokerPayload());
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);

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
      return { ...payload, credentials: { ...payload.credentials, testnet: payload.is_paper } };
    }
    return { ...payload, credentials: { ...payload.credentials, paper: payload.is_paper } };
  }, [payload]);

  function updateCredential(key: string, value: string | number | boolean) {
    setPayload((c) => ({ ...c, credentials: { ...c.credentials, [key]: value } }));
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestOk(false);
    try {
      const result = await apiClient.testBrokerConnection(effectivePayload);
      setTestOk(result.connected);
      setTestResult(result.connected ? "Connection successful." : "Connection failed.");
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.connectBroker(effectivePayload);
      setTestResult("Saved.");
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-[#2A2D37] bg-[#0F1117]/60 p-5">
      <h4 className="mb-4 text-sm font-medium text-white">Add Broker</h4>
      <div className="grid gap-4">
        <label className="text-xs text-slate-500">
          Broker
          <select
            className={inputClass}
            value={payload.broker}
            onChange={(e) =>
              setPayload({
                broker: e.target.value as BrokerConnectionPayload["broker"],
                is_paper: true,
                credentials:
                  e.target.value === "ibkr"
                    ? { host: "127.0.0.1", port: 7497, client_id: 1 }
                    : e.target.value === "binance"
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
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-500">
              API Key
              <input
                className={inputClass}
                value={String(payload.credentials.api_key ?? "")}
                onChange={(e) => updateCredential("api_key", e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-500">
              Secret Key
              <input
                className={inputClass}
                type="password"
                value={String(payload.credentials.api_secret ?? "")}
                onChange={(e) => updateCredential("api_secret", e.target.value)}
              />
            </label>
          </div>
        )}

        {payload.broker === "ibkr" && (
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-500">
              Host
              <input
                className={inputClass}
                value={String(payload.credentials.host ?? "127.0.0.1")}
                onChange={(e) => updateCredential("host", e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-500">
              Port
              <input
                className={inputClass}
                type="number"
                value={String(payload.credentials.port ?? 7497)}
                onChange={(e) => updateCredential("port", Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-500">
              Client ID
              <input
                className={inputClass}
                type="number"
                value={String(payload.credentials.client_id ?? 1)}
                onChange={(e) => updateCredential("client_id", Number(e.target.value))}
              />
            </label>
          </div>
        )}

        {payload.broker === "binance" && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-500">
              API Key
              <input
                className={inputClass}
                value={String(payload.credentials.api_key ?? "")}
                onChange={(e) => updateCredential("api_key", e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-500">
              Secret Key
              <input
                className={inputClass}
                type="password"
                value={String(payload.credentials.secret_key ?? "")}
                onChange={(e) => updateCredential("secret_key", e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-[#2A2D37] px-4 py-3">
          <div>
            <div className="text-sm text-white">
              {payload.broker === "binance" ? "Use testnet" : "Paper trading mode"}
            </div>
            <div className="text-xs text-slate-500">Recommended for initial setup.</div>
          </div>
          <button
            type="button"
            onClick={() => setPayload((c) => ({ ...c, is_paper: !c.is_paper }))}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              payload.is_paper
                ? "bg-green-500/15 text-green-400"
                : "bg-slate-700/40 text-slate-400"
            }`}
          >
            {payload.is_paper ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleTest()}
          disabled={testing}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !testOk}
          className="rounded-lg border border-[#2A2D37] px-4 py-2 text-sm text-slate-300 transition hover:text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {testResult && (
          <div
            className={`flex items-center gap-1.5 text-sm ${testOk ? "text-green-400" : "text-red-400"}`}
          >
            {testOk ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Settings page ──────────────────────────────────── */
export function Settings(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>("brokers");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "brokers", label: "Brokers" },
    { id: "preferences", label: "Preferences" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-[#2A2D37] bg-[#0F1117] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-[#1A1D27] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Brokers tab */}
      {activeTab === "brokers" && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400">Connected Brokers</h3>
          <BrokerCard broker="alpaca" onRefresh={() => {}} />
          <h3 className="mt-6 text-sm font-medium text-slate-400">Add a Broker</h3>
          <AddBrokerForm />
        </div>
      )}

      {/* Preferences tab */}
      {activeTab === "preferences" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-6">
            <h3 className="mb-5 text-base font-semibold text-white">Preferences</h3>
            <div className="space-y-3">
              {[
                {
                  label: "Alert sound",
                  description: "Play a sound when a rule violation fires.",
                  value: "Off",
                },
                {
                  label: "Overlay position",
                  description: "Where the floating alert cards appear on screen.",
                  value: "Bottom-right",
                },
                {
                  label: "Theme",
                  description: "UI color scheme.",
                  value: "Dark",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-[#2A2D37] bg-[#0F1117] px-4 py-4"
                >
                  <div>
                    <div className="text-sm text-white">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.description}</div>
                  </div>
                  <span className="text-sm font-medium text-slate-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account tab */}
      {activeTab === "account" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-6">
            <h3 className="mb-1 text-base font-semibold text-white">Account</h3>
            <p className="mb-5 text-sm text-slate-500">
              Manage your email and authentication settings.
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                  Email
                </label>
                <input
                  className="w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-4 py-2.5 text-sm text-slate-400"
                  value="test@shadowtrader.dev"
                  disabled
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <h3 className="mb-1 text-base font-semibold text-red-400">Danger Zone</h3>
            <p className="mb-5 text-sm text-slate-500">
              These actions are permanent and cannot be undone.
            </p>
            <button
              type="button"
              className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
