export function StepComplete({
  broker,
  template,
}: {
  broker: string;
  template: string;
}): JSX.Element {
  return (
    <div className="rounded-[28px] border border-success/30 bg-success/10 p-8 shadow-panel">
      <h3 className="text-2xl font-semibold text-white">Setup complete</h3>
      <p className="mt-3 text-sm text-slate-100">
        Connected to {broker} with the {template} template. Your dashboard, overlay, and live coaching tools are ready.
      </p>
    </div>
  );
}
