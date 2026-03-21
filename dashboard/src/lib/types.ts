export type RuleType =
  | "max_trades_per_day"
  | "max_loss_per_day"
  | "min_time_between_trades"
  | "no_trading_after"
  | "max_position_size"
  | "max_consecutive_losses"
  | "cooldown_after_loss"
  | "required_setup_tag";

export type Severity = "warn" | "block" | "log";

export type Rule = {
  id: string;
  user_id: string;
  rule_type: RuleType;
  severity: Severity;
  params: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
};

export type Trade = {
  id: string;
  user_id: string;
  broker: string;
  broker_trade_id: string;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  pnl: string | null;
  timestamp: string;
  session_id: string | null;
  metadata: Record<string, unknown>;
};

export type TradingSession = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  trade_count: number;
  rules_followed: number;
  rules_broken: number;
  total_pnl: string;
  discipline_score: string | null;
  summary: string | null;
  created_at: string;
};

export type AlertItem = {
  id?: string;
  user_id?: string;
  rule_id?: string | null;
  trade_id?: string | null;
  message: string;
  severity: Severity;
  rule_type?: RuleType;
  pattern_type?: string;
  timestamp: string;
  type?: string;
  acknowledged?: boolean;
  confidence?: number | null;
};

export type BrokerStatus = {
  broker: string;
  connected: boolean;
  is_paper: boolean;
  snapshot: {
    equity: number;
    cash: number;
    buying_power: number;
    daily_pnl: number;
    open_positions: number;
  } | null;
  error?: string | null;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: {
    reflection_question?: string;
    context_used?: {
      trades_referenced: number;
      patterns_detected: string[];
      discipline_score_today: number;
    };
  };
  created_at: string;
};

export type ChatResponse = {
  response: string;
  reflection_question: string;
  context_used: {
    trades_referenced: number;
    patterns_detected: string[];
    discipline_score_today: number;
  };
};

export type SessionSummary = {
  session_id: string;
  summary: string;
};

export type BrokerConnectionPayload = {
  broker: "alpaca" | "ibkr" | "binance";
  credentials: Record<string, string | number | boolean | undefined>;
  is_paper: boolean;
};

export type SubscriptionStatus = {
  user_id: string;
  tier: string;
  status: string;
  current_period_end: string | null;
  is_trial: boolean;
  features: string[];
};

export type AuthUser = {
  id: string;
  email: string | null;
};
