import { Outlet, useLocation } from "react-router-dom";

import { Sidebar } from "./Sidebar";

type PageMeta = { title: string; subtitle: string };

const PAGE_META: Record<string, PageMeta> = {
  "/rules": {
    title: "Trading Rules",
    subtitle: "Define the guardrails that protect your process during live sessions.",
  },
  "/session": {
    title: "Today's Session",
    subtitle: "Live trade timeline, violation feed, and daily narrative summary.",
  },
  "/score": {
    title: "Discipline Score",
    subtitle: "Your rule-adherence score, breakdown, and 7-day history.",
  },
  "/chat": {
    title: "AI Coach",
    subtitle: "Ask about patterns, behavior, and discipline — your coach uses real trade data.",
  },
  "/billing": {
    title: "Billing",
    subtitle: "Manage your plan, trial status, and payment details.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Broker connections, preferences, and account management.",
  },
  "/profile": {
    title: "Profile",
    subtitle: "Your trader identity, experience level, and lifetime stats.",
  },
};

export function Layout(): JSX.Element {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] ?? { title: "Dashboard", subtitle: "" };

  return (
    <div className="flex min-h-screen bg-[#0F1117] text-slate-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* Page header */}
        <header className="border-b border-[#1E2130] bg-[#0B0E14]/60 px-8 py-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">{meta.title}</h1>
              {meta.subtitle && (
                <p className="mt-1 text-sm text-slate-500">{meta.subtitle}</p>
              )}
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
              Paper Trading
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
