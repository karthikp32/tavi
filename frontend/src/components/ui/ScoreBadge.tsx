interface ScoreBadgeProps {
  label: string;
  value: number | null | undefined;
  max?: number;
  invert?: boolean; // true when lower is better, e.g. risk score
}

export function ScoreBadge({ label, value, max = 1, invert = false }: ScoreBadgeProps) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
        {label}: n/a
      </span>
    );
  }

  const ratio = Math.min(1, Math.max(0, value / max));
  const goodRatio = invert ? 1 - ratio : ratio;

  let classes = "bg-red-50 text-red-700";
  if (goodRatio >= 0.66) classes = "bg-emerald-50 text-emerald-700";
  else if (goodRatio >= 0.4) classes = "bg-amber-50 text-amber-700";

  const display = max === 1 ? value.toFixed(2) : value.toFixed(0);

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${classes}`}>
      {label}: {display}
    </span>
  );
}
