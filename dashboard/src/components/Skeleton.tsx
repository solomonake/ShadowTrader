export function SkeletonLine({ className = "" }: { className?: string }): JSX.Element {
  return <div className={`animate-pulse rounded bg-[#2A2D37] ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }): JSX.Element {
  return <div className={`animate-pulse rounded-2xl border border-[#2A2D37] bg-[#1A1D27] ${className}`} />;
}

export function SkeletonStat(): JSX.Element {
  return (
    <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-5">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonLine className="mt-3 h-7 w-16" />
    </div>
  );
}

export function SkeletonRuleCard(): JSX.Element {
  return (
    <div className="rounded-2xl border border-[#2A2D37] bg-[#1A1D27] p-5">
      <div className="flex items-start justify-between">
        <SkeletonLine className="h-4 w-40" />
        <SkeletonLine className="h-5 w-12 rounded-full" />
      </div>
      <SkeletonLine className="mt-3 h-3 w-56" />
      <SkeletonLine className="mt-2 h-3 w-32" />
    </div>
  );
}
