import { apiClient } from "../api/client";
import type { TradingSession } from "../lib/types";
import { useApi } from "./useApi";

export function useSessions() {
  const state = useApi<TradingSession[]>(apiClient.getSessions, []);
  return {
    ...state,
    latestSession: state.data?.[0] ?? null,
  };
}
