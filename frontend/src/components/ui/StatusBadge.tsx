const COLOR_BY_KEYWORD: { match: RegExp; classes: string }[] = [
  { match: /cancelled|declined|not_selected|rejected|failed|withdrawn|expired|unavailable/, classes: "bg-red-50 text-red-700 ring-red-200" },
  { match: /awarded|selected|accepted|completed|recommended|confirmed/, classes: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { match: /draft|discovered|pending/, classes: "bg-slate-100 text-slate-600 ring-slate-200" },
  { match: /bid_submitted|negotiating|collecting_bids/, classes: "bg-amber-50 text-amber-700 ring-amber-200" },
];

function classesFor(status: string): string {
  for (const entry of COLOR_BY_KEYWORD) {
    if (entry.match.test(status)) return entry.classes;
  }
  return "bg-sky-50 text-sky-700 ring-sky-200";
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${classesFor(status)}`}
    >
      {label}
    </span>
  );
}
