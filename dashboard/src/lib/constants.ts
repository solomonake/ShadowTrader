import type { RuleType } from "./types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws/alerts";
export const USER_ID = "00000000-0000-0000-0000-000000000001";
export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE ?? "dev";
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const RULE_LABELS: Record<RuleType, string> = {
  max_trades_per_day: "Max Trades Per Day",
  max_loss_per_day: "Max Daily Loss",
  min_time_between_trades: "Minimum Time Between Trades",
  no_trading_after: "Stop Trading After",
  max_position_size: "Max Position Size",
  max_consecutive_losses: "Max Consecutive Losses",
  cooldown_after_loss: "Cooldown After Loss",
  required_setup_tag: "Required Setup Tag",
};

export const RULE_TYPES = Object.entries(RULE_LABELS).map(([value, label]) => ({
  value: value as RuleType,
  label,
}));

export const SEVERITY_COLORS = {
  warn: "text-warn border-warn/40 bg-warn/10",
  block: "text-block border-block/40 bg-block/10",
  log: "text-slate-400 border-slate-500/40 bg-slate-500/10",
} as const;

export const BROKER_OPTIONS = [
  {
    value: "alpaca",
    label: "Alpaca",
    markets: "Stocks + crypto",
    paperLabel: "Paper trading available",
    docsUrl: "https://alpaca.markets/docs/",
  },
  {
    value: "ibkr",
    label: "Interactive Brokers",
    markets: "Stocks + options + futures",
    paperLabel: "Paper trading available",
    docsUrl: "https://www.interactivebrokers.com/en/trading/tws.php",
  },
  {
    value: "binance",
    label: "Binance",
    markets: "Crypto",
    paperLabel: "Testnet available",
    docsUrl: "https://developers.binance.com/docs",
  },
] as const;

export const RULE_TEMPLATES = [
  {
    value: "day_trader",
    label: "Day Trader",
    recommended: true,
    rules: [
      "Max 6 trades/day (warn)",
      "Max $300 daily loss (block)",
      "10-min cooldown after loss (warn)",
      "Stop trading after 3:30 PM ET (warn)",
      "Max 3 consecutive losses (block)",
    ],
  },
  {
    value: "swing_trader",
    label: "Swing Trader",
    recommended: false,
    rules: [
      "Max 3 trades/day (warn)",
      "Max $500 daily loss (block)",
      "60-min between trades (warn)",
      "Max $10,000 position size (warn)",
    ],
  },
  {
    value: "scalper",
    label: "Scalper",
    recommended: false,
    rules: [
      "Max 20 trades/day (warn)",
      "Max $200 daily loss (block)",
      "5-min cooldown after loss (warn)",
      "Max 4 consecutive losses (block)",
      "Max $3,000 position size (warn)",
    ],
  },
  {
    value: "crypto_trader",
    label: "Crypto Trader",
    recommended: false,
    rules: [
      "Max 10 trades/day (warn)",
      "Max $250 daily loss (block)",
      "No trading after midnight UTC (warn)",
      "15-min cooldown after loss (warn)",
      "5-min between trades (warn)",
    ],
  },
  {
    value: "custom",
    label: "Custom",
    recommended: false,
    rules: ["Start with an empty rule builder"],
  },
] as const;
