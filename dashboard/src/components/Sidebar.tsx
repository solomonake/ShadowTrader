import { NavLink } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

const items = [
  { to: "/rules", icon: "◫", label: "Rules" },
  { to: "/session", icon: "◬", label: "Session" },
  { to: "/score", icon: "◎", label: "Score" },
  { to: "/chat", icon: "◌", label: "Chat" },
  { to: "/billing", icon: "◈", label: "Billing" },
  { to: "/settings", icon: "⚙", label: "Settings" },
];

export function Sidebar(): JSX.Element {
  const { user, signOut } = useAuth();

  return (
    <aside className="sticky top-0 flex min-h-screen w-72 flex-col border-r border-edge bg-[#11141D]/95 px-6 py-7">
      <div className="mb-10 rounded-2xl border border-edge bg-panel px-5 py-5 shadow-panel">
        <div className="text-xs uppercase tracking-[0.3em] text-primary">Discipline First</div>
        <div className="mt-3 text-xl font-semibold text-white">ShadowTrader</div>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Real-time behavioral coaching for active traders. Alerts, reviews, and discipline tracking in one workspace.
        </p>
      </div>
      <nav className="space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                isActive
                  ? "border-primary/30 bg-primary/10 text-white"
                  : "border-transparent text-slate-400 hover:border-edge hover:bg-panel/80 hover:text-white"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-edge bg-panel px-4 py-4">
        <div className="text-sm font-medium text-white">{user?.email ?? "Dev User"}</div>
        <button type="button" onClick={() => void signOut()} className="mt-3 rounded-xl border border-edge px-4 py-2 text-sm text-slate-300">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
