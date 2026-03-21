export function PricingCard({
  title,
  price,
  description,
  features,
  highlighted = false,
  action,
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <div className={`rounded-[28px] border p-6 shadow-panel ${highlighted ? "border-primary/40 bg-primary/10" : "border-edge bg-panel"}`}>
      <div className="text-sm uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{price}</div>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
      <ul className="mt-5 space-y-3 text-sm text-slate-200">
        {features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
