import { API_URL, USER_ID } from "../lib/constants";
import type {
  AlertItem,
  BrokerConnectionPayload,
  BrokerStatus,
  ChatMessage,
  ChatResponse,
  Rule,
  SessionSummary,
  SubscriptionStatus,
  Trade,
  TradingSession,
} from "../lib/types";

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = window.localStorage.getItem("shadowtrader-access-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!token ? { "x-user-id": USER_ID } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `API error: ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string; error?: string };
      detail = payload.error ?? payload.detail ?? detail;
    } catch {
      detail = `API error: ${response.status}`;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  getRules: () => apiCall<Rule[]>("/api/rules"),
  createRule: (payload: Partial<Rule> & { rule_type: string; params: Record<string, unknown>; severity: string }) =>
    apiCall<Rule>("/api/rules", {
      method: "POST",
      body: JSON.stringify({ ...payload, user_id: USER_ID }),
    }),
  updateRule: (ruleId: string, payload: Partial<Rule>) =>
    apiCall<Rule>(`/api/rules/${ruleId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteRule: (ruleId: string) =>
    apiCall<void>(`/api/rules/${ruleId}`, {
      method: "DELETE",
    }),
  getTrades: () => apiCall<Trade[]>("/api/trades"),
  getSessions: () => apiCall<TradingSession[]>("/api/sessions"),
  getAlerts: () => apiCall<AlertItem[]>("/alerts"),
  getBrokerStatus: (broker?: string) => apiCall<BrokerStatus>(`/api/broker/status${broker ? `?broker=${broker}` : ""}`),
  testBrokerConnection: (payload: BrokerConnectionPayload) =>
    apiCall<BrokerStatus>("/api/broker/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  connectBroker: (payload: BrokerConnectionPayload) =>
    apiCall<BrokerStatus>("/api/broker/connect", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  applyRuleTemplate: (templateName: string) =>
    apiCall<Rule[]>(`/api/rules/templates/${templateName}`, {
      method: "POST",
    }),
  sendChatMessage: (message: string) =>
    apiCall<ChatResponse>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  getChatHistory: () => apiCall<ChatMessage[]>("/api/chat/history"),
  generateSessionSummary: () =>
    apiCall<SessionSummary>("/api/sessions/summary", {
      method: "POST",
    }),
  getSessionSummary: (sessionId: string) => apiCall<SessionSummary>(`/api/sessions/${sessionId}/summary`),
  getBillingStatus: () => apiCall<SubscriptionStatus>("/api/billing/status"),
  createCheckout: (tier: string, interval: string) =>
    apiCall<{ checkout_url: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ tier, interval }),
    }),
  createPortal: () =>
    apiCall<{ portal_url: string }>("/api/billing/portal", {
      method: "POST",
    }),
  getMe: () => apiCall<{ user_id: string }>("/api/auth/me"),
};
