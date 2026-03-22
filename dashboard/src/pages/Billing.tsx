import { Check, ChevronRight, Clock, X } from "lucide-react";
import { useState } from "react";

import { apiClient } from "../api/client";
import { useApi } from "../hooks/useApi";

type Interval = "monthly" | "yearly";

const FEATURES: Array<{ label: string; starter: boolean | string; pro: boolean | string }> = [
  { label: "Rule enforcement & live alerts", starter: true, pro: true },
  { label: "Overlay alert cards", starter: true, pro: true },
  { label: "Session timeline & trade history", starter: true, pro: true },
  { label: "Basic behavioral patterns", starter: true, pro: true },
  { label: "Broker integrations", starter: "2 brokers", pro: "Unlimited" },
  { label: "AI coaching chat", starter: false, pro: true },
  { label: "Daily session summaries", starter: false, pro: true },
  { label: "Full pattern library", starter: false, pro: true },
  { label: "Priority support", starter: false, pro: true },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is there a free trial?",
    a: "Yes — every new account gets 14 days of full Pro access. No credit card required.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Cancel before your trial or billing date and you won't be charged.",
  },
  {
    q: "Does this connect to live trading?",
    a: "ShadowTrader is an observability tool. It monitors and alerts — it never executes orders on your behalf.",
  },
  {
    q: "What brokers are supported?",
    a: "Alpaca (paper + live), Interactive Brokers, and Binance/Binance testnet. More coming.",
  },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={15} className="mx-auto text-green-500" />;
  if (value === false) return <X size={15} className="mx-auto text-slate-600" />;
  return <span className="text-xs font-medium text-blue-400">{value}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#2A2D37] last:border-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm text-slate-200 transition hover:text-white"
        onClick={() => setOpen((v) => !v)}
      >
        {q}
        <ChevronRight
          size={14}
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-slate-500">{a}</p>}
    </div>
  );
}

export function Billing(): JSX.Element {
  const { data, loading } = useApi(apiClient.getBillingStatus, []);
  const [interval, setInterval] = useState<Interval>("monthly");
  const [actionError, setActionError] = useState<string | null>(null);

  const trialDaysLeft = 12; // placeholder — real value from data.trial_ends_at
  const isTrialing = !data || data.is_trial || data.status === "trialing";

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

  const starterMonthly = 29;
  const proMonthly = 59;
  const starterPrice = interval === "monthly" ? `$${starterMonthly}/mo` : "$249/yr";
  const proPrice = interval === "monthly" ? `$${proMonthly}/mo` : "$499/yr";
  const yearlySaving = "Save 30%";

  return (
    <div className="space-y-8">
      {/* Trial / Current plan banner */}
      {!loading && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Clock size={18} className="mt-0.5 shrink-0 text-amber-400" />
              <div>
                <div className="font-medium text-white">
                  {isTrialing
                    ? `Free Trial — ${trialDaysLeft} days remaining`
                    : `${data?.tier ?? "Pro"} Plan · ${data?.status ?? "Active"}`}
                </div>
                <div className="mt-0.5 text-sm text-slate-400">
                  {isTrialing
                    ? "Upgrade before your trial ends to keep your discipline streak going."
                    : "You're on a paid plan. Manage or cancel below."}
                </div>
              </div>
            </div>
            {!isTrialing && (
              <button
                type="button"
                onClick={() => void openPortal()}
                className="rounded-lg border border-[#2A2D37] px-4 py-2 text-sm text-slate-300 transition hover:border-[#363A47] hover:text-white"
              >
                Manage Subscription
              </button>
            )}
          </div>
          {isTrialing && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                <span>Trial started</span>
                <span>{trialDaysLeft} days left</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2A2D37]">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${100 - (trialDaysLeft / 14) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Interval toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Choose a Plan</h2>
        <div className="inline-flex items-center gap-1 rounded-full border border-[#2A2D37] bg-[#0F1117] p-1">
          {(["monthly", "yearly"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setInterval(v)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition ${
                interval === v ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {v}
              {v === "yearly" && (
                <span className="ml-1.5 rounded-full bg-green-500/20 px-1.5 py-0.5 text-green-400">
                  {yearlySaving}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Starter */}
        <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-6 transition hover:border-[#363A47]">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Starter</div>
          <div className="mt-3 text-3xl font-bold text-white">{starterPrice}</div>
          <p className="mt-2 text-sm text-slate-500">
            Rules, sessions, alerts, broker tools, and core behavioral analytics.
          </p>
          <button
            type="button"
            onClick={() => void goToCheckout("starter")}
            className="mt-6 w-full rounded-lg border border-[#2A2D37] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-[#363A47] hover:text-white"
          >
            Upgrade to Starter
          </button>
        </div>

        {/* Pro (highlighted) */}
        <div className="relative rounded-2xl border border-blue-500/40 bg-blue-600/5 p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              Recommended
            </span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest text-blue-400">Pro</div>
          <div className="mt-3 text-3xl font-bold text-white">{proPrice}</div>
          <p className="mt-2 text-sm text-slate-400">
            Adds AI coaching, daily summaries, and unlimited broker support.
          </p>
          <button
            type="button"
            onClick={() => void goToCheckout("pro")}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Upgrade to Pro
          </button>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] overflow-hidden">
        <div className="grid grid-cols-3 border-b border-[#2A2D37] px-6 py-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Feature</div>
          <div className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
            Starter
          </div>
          <div className="text-center text-xs font-semibold uppercase tracking-widest text-blue-400">
            Pro
          </div>
        </div>
        {FEATURES.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-3 border-b border-[#2A2D37] px-6 py-3.5 last:border-0 hover:bg-[#0F1117]/40"
          >
            <div className="text-sm text-slate-300">{row.label}</div>
            <div className="flex items-center justify-center">
              <FeatureCell value={row.starter} />
            </div>
            <div className="flex items-center justify-center">
              <FeatureCell value={row.pro} />
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] px-6 py-2">
        <h3 className="py-4 text-base font-semibold text-white">Frequently Asked Questions</h3>
        {FAQ.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}
