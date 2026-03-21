import { Outlet, useLocation } from "react-router-dom";

import { Sidebar } from "./Sidebar";

const pageTitles: Record<string, string> = {
  "/rules": "Trading Rules",
  "/session": "Today's Session",
  "/score": "Discipline Score",
  "/chat": "Coach Chat",
  "/billing": "Billing",
  "/settings": "Settings",
};

export function Layout(): JSX.Element {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-shell text-slate-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-edge/80 bg-panel/80 px-8 py-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">ShadowTrader AI</p>
              <h1 className="mt-2 text-2xl font-semibold">{pageTitles[location.pathname] ?? "Dashboard"}</h1>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
              Paper Trading Mode
            </div>
          </div>
        </header>
        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
