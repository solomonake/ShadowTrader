import { apiClient } from "../api/client";
import type { Rule } from "../lib/types";
import { useApi } from "./useApi";

export function useRules() {
  const state = useApi<Rule[]>(apiClient.getRules, []);

  return {
    ...state,
    async createRule(payload: { rule_type: Rule["rule_type"]; params: Record<string, unknown>; severity: Rule["severity"]; enabled: boolean }) {
      await apiClient.createRule(payload);
      await state.refresh();
    },
    async updateRule(ruleId: string, payload: Partial<Rule>) {
      await apiClient.updateRule(ruleId, payload);
      await state.refresh();
    },
    async deleteRule(ruleId: string) {
      await apiClient.deleteRule(ruleId);
      await state.refresh();
    },
  };
}
