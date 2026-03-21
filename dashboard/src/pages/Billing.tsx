import { useState } from "react";

import { apiClient } from "../api/client";
import { PricingCard } from "../components/PricingCard";
import { useApi } from "../hooks/useApi";

export function Billing(): JSX.Element {
  const { data, loading, error } = useApi(apiClient.getBillingStatus, []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  async function goToCheckout(tier: string) {
    setActionError(null);
    try {
      const result = await apiClient.createCheckout(tier, interval);
      window.location.href = result.checkout_url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to start checkout.");
    }
  }

  async function openPortal() {
    setActionError(null);
    try {
      const result = await apiClient.createPortal();
      window.location.href = result.portal_url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open billing portal.");
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-edge bg-panel p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-white">Current Plan</h2>
        {loading && <div className="mt-4 text-sm text-slate-400">Loading billing status...</div>}
        {error && <div className="mt-4 text-sm text-block">{error}</div>}
        {data && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Tier</div>
              <div className="mt-2 text-lg font-semibold text-white">{data.tier}</div>
            </div>
            <div className="rounded-2xl border border-edge bg-[#11141D] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</div>
              <div className="mt-2 text-lg font-semibold text-white">{data.status}</div>
            </div>
          </div>
        )}
        <div className="mt-5">
          <button type="button" onClick={() => void openPortal()} className="rounded-2xl border border-edge px-5 py-3 text-sm text-slate-200">
            Manage Subscription
          </button>
        </div>
        {actionError && <div className="mt-3 text-sm text-block">{actionError}</div>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2 flex justify-end">
          <div className="inline-flex rounded-full border border-edge bg-[#11141D] p-1 text-sm">
            {(["monthly", "yearly"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setInterval(value)}
                className={`rounded-full px-4 py-2 capitalize ${interval === value ? "bg-primary text-white" : "text-slate-400"}`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <PricingCard
          title="Starter"
          price={interval === "monthly" ? "$29/mo" : "$249/yr"}
          description="Rules, sessions, alerts, broker tools, and core behavioral analytics."
          features={["Rule enforcement", "Overlay alerts", "Basic patterns", "2 broker integrations"]}
          action={<button type="button" onClick={() => void goToCheckout("starter")} className="rounded-2xl border border-edge px-5 py-3 text-sm text-slate-100">Upgrade to Starter</button>}
        />
        <PricingCard
          title="Pro"
          price={interval === "monthly" ? "$59/mo" : "$499/yr"}
          description="Adds AI coaching, daily summaries, and unlimited broker support."
          features={["AI chat", "Daily summaries", "Full pattern library", "Unlimited brokers"]}
          highlighted
          action={<button type="button" onClick={() => void goToCheckout("pro")} className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white">Upgrade to Pro</button>}
        />
      </div>
    </section>
  );
}
