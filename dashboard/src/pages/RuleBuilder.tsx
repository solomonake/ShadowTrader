import { useState } from "react";

import { RuleCard } from "../components/RuleCard";
import { RuleForm } from "../components/RuleForm";
import type { Rule } from "../lib/types";
import { useRules } from "../hooks/useRules";

export function RuleBuilder(): JSX.Element {
  const { data: rules, loading, error, createRule, updateRule, deleteRule } = useRules();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Build the guardrails that keep your process intact in live sessions.</p>
        </div>
        <button type="button" onClick={() => { setEditingRule(null); setFormOpen(true); }} className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white">
          Add Rule
        </button>
      </div>

      {loading && <div className="rounded-3xl border border-edge bg-panel p-6 text-slate-400">Loading rules...</div>}
      {error && <div className="rounded-3xl border border-block/40 bg-block/10 p-6 text-block">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-2">
        {rules?.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onEdit={(selectedRule) => {
              setEditingRule(selectedRule);
              setFormOpen(true);
            }}
            onToggle={(selectedRule) => void updateRule(selectedRule.id, { enabled: !selectedRule.enabled })}
            onDelete={(ruleId) => void deleteRule(ruleId)}
          />
        ))}
      </div>

      {!loading && rules?.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-edge bg-panel/60 p-8 text-center text-slate-400">
          No rules yet. Add your first discipline rule to start live enforcement.
        </div>
      )}

      {formOpen && (
        <RuleForm
          initialRule={editingRule}
          onCancel={() => {
            setEditingRule(null);
            setFormOpen(false);
          }}
          onSave={async (payload) => {
            if (editingRule) {
              await updateRule(editingRule.id, payload);
            } else {
              await createRule(payload);
            }
            setEditingRule(null);
            setFormOpen(false);
          }}
        />
      )}
    </section>
  );
}
