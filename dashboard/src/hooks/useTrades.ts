import { apiClient } from "../api/client";
import type { Trade } from "../lib/types";
import { useApi } from "./useApi";

export function useTrades() {
  const state = useApi<Trade[]>(apiClient.getTrades, []);

  return {
    ...state,
    todayTrades:
      state.data?.filter((trade) => {
        const tradeDate = new Date(trade.timestamp);
        const now = new Date();
        return (
          tradeDate.getFullYear() === now.getFullYear() &&
          tradeDate.getMonth() === now.getMonth() &&
          tradeDate.getDate() === now.getDate()
        );
      }) ?? [],
  };
}
