import {
  BarChart3,
  Bot,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

type NavItem = { to: string; icon: React.ElementType; label: string };

const tradingNav: NavItem[] = [
  { to: "/rules", icon: ShieldCheck, label: "Rules" },
  { to: "/session", icon: LayoutDashboard, label: "Session" },
  { to: "/score", icon: BarChart3, label: "Score" },
];

const aiNav: NavItem[] = [{ to: "/chat", icon: Bot, label: "Coach" }];

const accountNav: NavItem[] = [
  { to: "/billing", icon: CreditCard, label: "Billing" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/profile", icon: User, label: "Profile" },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
        {label}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-slate-400 hover:bg-[#1E2130] hover:text-slate-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-blue-500" />
                  )}
                  <Icon
                    size={16}
                    className={isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

function initials(email: string | null): string {
  if (!email) return "ST";
  const parts = email.split("@")[0].split(/[._-]/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function Sidebar(): JSX.Element {
  const { user, signOut } = useAuth();

  return (
    <aside className="sticky top-0 flex min-h-screen w-64 flex-col border-r border-[#1E2130] bg-[#0B0E14]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-[#1E2130] px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Zap size={15} className="text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">ShadowTrader</div>
          <div className="text-[10px] text-slate-500">Discipline First</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        <NavGroup label="Trading" items={tradingNav} />
        <NavGroup label="AI Coach" items={aiNav} />
        <NavGroup label="Account" items={accountNav} />
      </nav>

      {/* User card */}
      <div className="border-t border-[#1E2130] px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-400">
            {initials(user?.email ?? null)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-200">
              {user?.email?.split("@")[0] ?? "Dev User"}
            </div>
            <div className="truncate text-[11px] text-slate-500">{user?.email ?? "dev mode"}</div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            title="Sign out"
            className="shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-[#1E2130] hover:text-slate-300"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
