import { useEffect, useState } from "react";

import { RULE_TYPES } from "../lib/constants";
import type { Rule, RuleType, Severity } from "../lib/types";

type RuleFormProps = {
  initialRule?: Rule | null;
  onSave: (payload: { rule_type: RuleType; params: Record<string, unknown>; severity: Severity; enabled: boolean }) => Promise<void>;
  onCancel: () => void;
};

function defaultParams(ruleType: RuleType): Record<string, unknown> {
  switch (ruleType) {
    case "max_trades_per_day":
      return { max: 5 };
    case "max_loss_per_day":
      return { max_loss: 500 };
    case "min_time_between_trades":
      return { minutes: 10 };
    case "no_trading_after":
      return { hour: 11, minute: 0, timezone: "America/New_York" };
    case "max_position_size":
      return { max_quantity: 500, max_value: 10000 };
    case "max_consecutive_losses":
      return { max: 2 };
    case "cooldown_after_loss":
      return { minutes: 20 };
    case "required_setup_tag":
      return { allowed_setups: ["breakout"] };
  }
}

export function RuleForm({ initialRule, onSave, onCancel }: RuleFormProps): JSX.Element {
  const [ruleType, setRuleType] = useState<RuleType>(initialRule?.rule_type ?? "max_trades_per_day");
  const [severity, setSeverity] = useState<Severity>(initialRule?.severity ?? "warn");
  const [enabled, setEnabled] = useState<boolean>(initialRule?.enabled ?? true);
  const [params, setParams] = useState<Record<string, unknown>>(initialRule?.params ?? defaultParams("max_trades_per_day"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialRule) {
      setRuleType(initialRule.rule_type);
      setSeverity(initialRule.severity);
      setEnabled(initialRule.enabled);
      setParams(initialRule.params);
      return;
    }
    setRuleType("max_trades_per_day");
    setSeverity("warn");
    setEnabled(true);
    setParams(defaultParams("max_trades_per_day"));
  }, [initialRule]);

  useEffect(() => {
    if (!initialRule) {
      setParams(defaultParams(ruleType));
    }
  }, [ruleType, initialRule]);

  const inputClassName =
    "mt-2 w-full rounded-2xl border border-edge bg-[#11141D] px-4 py-3 text-sm text-white outline-none transition focus:border-primary/50";

  const setParam = (key: string, value: unknown) => {
    setParams((current) => ({ ...current, [key]: value }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({ rule_type: ruleType, params, severity, enabled });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{initialRule ? "Edit Rule" : "Add Rule"}</h2>
            <p className="mt-1 text-sm text-slate-400">Configure discipline rules without writing code.</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full border border-edge px-3 py-2 text-sm text-slate-300">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Rule Type
            <select value={ruleType} onChange={(event) => setRuleType(event.target.value as RuleType)} className={inputClassName}>
              {RULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm text-slate-300">
            Severity
            <div className="mt-2 flex gap-2">
              {(["warn", "block", "log"] as Severity[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSeverity(option)}
                  className={`rounded-2xl border px-4 py-3 text-sm capitalize ${
                    severity === option ? "border-primary bg-primary/10 text-white" : "border-edge text-slate-400"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {ruleType === "max_trades_per_day" && (
            <label className="text-sm text-slate-300">
              Maximum trades
              <input className={inputClassName} type="number" value={String(params.max ?? 5)} onChange={(event) => setParam("max", Number(event.target.value))} />
            </label>
          )}
          {ruleType === "max_loss_per_day" && (
            <label className="text-sm text-slate-300">
              Maximum loss ($)
              <input className={inputClassName} type="number" value={String(params.max_loss ?? 500)} onChange={(event) => setParam("max_loss", Number(event.target.value))} />
            </label>
          )}
          {ruleType === "min_time_between_trades" && (
            <label className="text-sm text-slate-300">
              Minutes between trades
              <input className={inputClassName} type="number" value={String(params.minutes ?? 10)} onChange={(event) => setParam("minutes", Number(event.target.value))} />
            </label>
          )}
          {ruleType === "no_trading_after" && (
            <>
              <label className="text-sm text-slate-300">
                Hour
                <input className={inputClassName} type="number" min={0} max={23} value={String(params.hour ?? 11)} onChange={(event) => setParam("hour", Number(event.target.value))} />
              </label>
              <label className="text-sm text-slate-300">
                Minute
                <input className={inputClassName} type="number" min={0} max={59} value={String(params.minute ?? 0)} onChange={(event) => setParam("minute", Number(event.target.value))} />
              </label>
              <label className="text-sm text-slate-300 md:col-span-2">
                Timezone
                <input className={inputClassName} type="text" value={String(params.timezone ?? "America/New_York")} onChange={(event) => setParam("timezone", event.target.value)} />
              </label>
            </>
          )}
          {ruleType === "max_position_size" && (
            <>
              <label className="text-sm text-slate-300">
                Max shares
                <input className={inputClassName} type="number" value={String(params.max_quantity ?? 500)} onChange={(event) => setParam("max_quantity", Number(event.target.value))} />
              </label>
              <label className="text-sm text-slate-300">
                Max dollar value
                <input className={inputClassName} type="number" value={String(params.max_value ?? 10000)} onChange={(event) => setParam("max_value", Number(event.target.value))} />
              </label>
            </>
          )}
          {ruleType === "max_consecutive_losses" && (
            <label className="text-sm text-slate-300">
              Max consecutive losses
              <input className={inputClassName} type="number" value={String(params.max ?? 2)} onChange={(event) => setParam("max", Number(event.target.value))} />
            </label>
          )}
          {ruleType === "cooldown_after_loss" && (
            <label className="text-sm text-slate-300">
              Cooldown minutes
              <input className={inputClassName} type="number" value={String(params.minutes ?? 20)} onChange={(event) => setParam("minutes", Number(event.target.value))} />
            </label>
          )}
          {ruleType === "required_setup_tag" && (
            <label className="text-sm text-slate-300 md:col-span-2">
              Allowed setup tags
              <input
                className={inputClassName}
                type="text"
                value={Array.isArray(params.allowed_setups) ? params.allowed_setups.join(", ") : ""}
                onChange={(event) =>
                  setParam(
                    "allowed_setups",
                    event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
          <div>
            <div className="text-sm text-white">Rule Enabled</div>
            <div className="text-xs text-slate-500">Disabled rules stay in the system but do not count during live evaluation.</div>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((current) => !current)}
            className={`rounded-full px-4 py-2 text-sm ${enabled ? "bg-success/15 text-success" : "bg-slate-700/40 text-slate-400"}`}
          >
            {enabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-edge px-5 py-3 text-sm text-slate-300">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60">
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </form>
    </div>
  );
}
