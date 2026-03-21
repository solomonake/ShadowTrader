import { RULE_LABELS, SEVERITY_COLORS } from "../lib/constants";
import type { Rule } from "../lib/types";

type RuleCardProps = {
  rule: Rule;
  onEdit: (rule: Rule) => void;
  onToggle: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
};

function renderParams(params: Record<string, unknown>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" • ");
}

export function RuleCard({ rule, onEdit, onToggle, onDelete }: RuleCardProps): JSX.Element {
  return (
    <article className="rounded-3xl border border-edge bg-panel p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{RULE_LABELS[rule.rule_type]}</h3>
          <p className="mt-2 text-sm text-slate-400">{renderParams(rule.params)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${SEVERITY_COLORS[rule.severity]}`}>
          {rule.severity}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onToggle(rule)}
          className={`rounded-full px-3 py-1 text-sm ${
            rule.enabled ? "bg-success/15 text-success" : "bg-slate-700/40 text-slate-400"
          }`}
        >
          {rule.enabled ? "Enabled" : "Disabled"}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit(rule)} className="rounded-xl border border-edge px-4 py-2 text-sm text-slate-200 hover:border-primary/40 hover:text-white">
            Edit
          </button>
          <button type="button" onClick={() => onDelete(rule.id)} className="rounded-xl border border-block/40 px-4 py-2 text-sm text-block hover:bg-block/10">
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
