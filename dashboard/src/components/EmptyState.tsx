import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2A2D37] bg-[#0F1117]/60 px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2A2D37] bg-[#1A1D27]">
        <Icon size={24} className="text-slate-500" />
      </div>
      <h3 className="text-base font-medium text-slate-200">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
