import { RULE_TEMPLATES } from "../../lib/constants";

export function StepRuleTemplate({
  selectedTemplate,
  onSelect,
}: {
  selectedTemplate: string;
  onSelect: (template: string) => void;
}): JSX.Element {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {RULE_TEMPLATES.map((template) => (
        <button
          key={template.value}
          type="button"
          onClick={() => onSelect(template.value)}
          className={`rounded-[24px] border p-5 text-left shadow-panel ${
            selectedTemplate === template.value ? "border-primary/40 bg-primary/10" : "border-edge bg-panel"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-lg font-semibold text-white">{template.label}</div>
            {template.recommended && <div className="rounded-full bg-primary/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-primary">Recommended</div>}
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {template.rules.map((rule) => (
              <li key={rule}>• {rule}</li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  );
}
