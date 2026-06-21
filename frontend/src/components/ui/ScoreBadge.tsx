interface ScoreBadgeProps {
  label: string;
  score: number | null;
}

function toneClasses(score: number | null): string {
  if (score === null) return "bg-tavi-pale-blue/60 text-tavi-navy/50";
  if (score >= 0.7) return "bg-emerald-100 text-emerald-700";
  if (score >= 0.4) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

export function ScoreBadge({ label, score }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses(score)}`}
    >
      <span>{label}</span>
      <span>{score === null ? "—" : score.toFixed(2)}</span>
    </span>
  );
}
