type ScoreGaugeProps = {
  score: number;
};

export function ScoreGauge({ score }: ScoreGaugeProps): JSX.Element {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(score, 100)) / 100) * circumference;
  const tone = score >= 90 ? "#22C55E" : score >= 70 ? "#F59E0B" : "#EF4444";
  const label = score >= 90 ? "Disciplined" : score >= 70 ? "Needs Work" : "Off Track";

  return (
    <div className="rounded-[28px] border border-edge bg-panel p-8 shadow-panel">
      <div className="flex flex-col items-center justify-center gap-5">
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="16" fill="none" />
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke={tone}
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 110 110)"
          />
          <text x="110" y="100" textAnchor="middle" fill="#E5E7EB" fontSize="42" fontWeight="700">
            {Math.round(score)}%
          </text>
          <text x="110" y="132" textAnchor="middle" fill={tone} fontSize="14" fontWeight="600" letterSpacing="0.12em">
            {label.toUpperCase()}
          </text>
        </svg>
        <p className="text-sm text-slate-400">(Rules Followed / Total Checks) × 100</p>
      </div>
    </div>
  );
}
