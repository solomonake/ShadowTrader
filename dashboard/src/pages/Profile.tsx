import { CalendarDays, Check, Edit2, TrendingUp, X } from "lucide-react";
import { useState } from "react";

import { useAuth } from "../auth/useAuth";
import { useApi } from "../hooks/useApi";
import { apiClient } from "../api/client";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];

const MARKETS = ["Stocks", "Options", "Futures", "Forex", "Crypto", "ETFs"];

function initials(email: string | null, name: string): string {
  if (name.trim()) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
  }
  if (!email) return "ST";
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-6">
      <h3 className="mb-5 text-base font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#2A2D37] bg-[#0F1117] px-4 py-4">
      <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#2A2D37] bg-[#0F1117] px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500/60 disabled:cursor-not-allowed disabled:opacity-50";

export function Profile(): JSX.Element {
  const { user } = useAuth();
  const { data: trades } = useApi(apiClient.getTrades, []);
  const { data: sessions } = useApi(apiClient.getSessions, []);

  // Local editable profile state (persisted to localStorage for now)
  const saved = JSON.parse(window.localStorage.getItem("shadowtrader-profile") ?? "{}") as Record<string, string>;
  const [displayName, setDisplayName] = useState<string>(saved.displayName ?? "");
  const [fullName, setFullName] = useState<string>(saved.fullName ?? "");
  const [timezone, setTimezone] = useState<string>(saved.timezone ?? "America/New_York");
  const [experience, setExperience] = useState<string>(saved.experience ?? "Intermediate");
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(
    saved.markets ? (saved.markets.split(",") as string[]) : ["Stocks"],
  );
  const [editing, setEditing] = useState(false);
  const [saved2, setSaved2] = useState(false);

  function toggleMarket(market: string) {
    setSelectedMarkets((current) =>
      current.includes(market) ? current.filter((m) => m !== market) : [...current, market],
    );
  }

  function handleSave() {
    const profile = { displayName, fullName, timezone, experience, markets: selectedMarkets.join(",") };
    window.localStorage.setItem("shadowtrader-profile", JSON.stringify(profile));
    setEditing(false);
    setSaved2(true);
    setTimeout(() => setSaved2(false), 2000);
  }

  function handleCancel() {
    // Revert to saved
    setDisplayName(saved.displayName ?? "");
    setFullName(saved.fullName ?? "");
    setTimezone(saved.timezone ?? "America/New_York");
    setExperience(saved.experience ?? "Intermediate");
    setSelectedMarkets(saved.markets ? (saved.markets.split(",") as string[]) : ["Stocks"]);
    setEditing(false);
  }

  const totalTrades = trades?.length ?? 0;
  const daysActive = sessions?.length ?? 0;
  const avgScore = sessions
    ? sessions.reduce((sum, s) => sum + Number(s.discipline_score ?? 0), 0) / Math.max(sessions.length, 1)
    : 0;
  const totalPnl = trades
    ? trades.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0)
    : 0;
  const memberSince = new Date(2026, 2, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const avatarInitials = initials(user?.email ?? null, fullName);

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-6">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-600/20 text-2xl font-bold text-blue-400">
            {avatarInitials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">
              {fullName || user?.email?.split("@")[0] || "Trader"}
            </h2>
            {displayName && (
              <div className="mt-0.5 text-sm text-slate-400">@{displayName}</div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} />
                Member since {memberSince}
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} />
                {experience}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved2 && (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <Check size={14} /> Saved
              </span>
            )}
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 rounded-lg border border-[#2A2D37] px-4 py-2 text-sm text-slate-300 transition hover:border-[#363A47] hover:text-white"
              >
                <Edit2 size={13} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2D37] px-3 py-2 text-sm text-slate-400 transition hover:text-white"
                >
                  <X size={13} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  <Check size={13} />
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Personal info */}
        <Section title="Personal Info">
          <div className="space-y-4">
            <Field label="Full Name">
              <input
                className={inputClass}
                value={fullName}
                disabled={!editing}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </Field>
            <Field label="Display Name / Alias">
              <input
                className={inputClass}
                value={displayName}
                disabled={!editing}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. solomon"
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                value={user?.email ?? ""}
                disabled
                readOnly
              />
              <p className="mt-1 text-xs text-slate-600">Managed by your auth provider.</p>
            </Field>
            <Field label="Timezone">
              <select
                className={inputClass}
                value={timezone}
                disabled={!editing}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        {/* Trading profile */}
        <Section title="Trading Profile">
          <div className="space-y-4">
            <Field label="Experience Level">
              <select
                className={inputClass}
                value={experience}
                disabled={!editing}
                onChange={(e) => setExperience(e.target.value)}
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Markets Traded">
              <div className="flex flex-wrap gap-2 pt-1">
                {MARKETS.map((market) => {
                  const active = selectedMarkets.includes(market);
                  return (
                    <button
                      key={market}
                      type="button"
                      disabled={!editing}
                      onClick={() => toggleMarket(market)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        active
                          ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                          : "border-[#2A2D37] text-slate-500 disabled:opacity-50 hover:border-[#363A47] hover:text-slate-300"
                      } disabled:cursor-not-allowed`}
                    >
                      {market}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Primary Broker">
              <input
                className={inputClass}
                value="Alpaca (Paper)"
                disabled
                readOnly
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* Trading stats */}
      <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-6">
        <h3 className="mb-5 text-base font-semibold text-white">Trading Stats</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBox label="Total Trades" value={totalTrades} />
          <StatBox label="Days Active" value={daysActive} />
          <StatBox label="Avg Discipline Score" value={`${avgScore.toFixed(1)}%`} />
          <StatBox
            label="Total P&L"
            value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
          />
        </div>
      </div>
    </div>
  );
}
