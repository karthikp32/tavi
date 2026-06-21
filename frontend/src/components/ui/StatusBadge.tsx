type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-tavi-pale-blue/60 text-tavi-navy/70",
  info: "bg-tavi-lavender/30 text-tavi-indigo",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
};

const statusToneMap: Record<string, Tone> = {
  draft: "neutral",
  ready_for_vendor_discovery: "info",
  discovering_vendors: "info",
  vendors_shortlisted: "info",
  contacting_vendors: "info",
  collecting_bids: "info",
  negotiating: "warning",
  ready_for_award: "warning",
  awarded: "success",
  scheduled: "success",
  in_progress: "success",
  completed: "success",
  cancelled: "danger",
  discovered: "neutral",
  shortlisted: "info",
  contact_pending: "neutral",
  contacted: "info",
  responded: "info",
  interested: "success",
  unavailable: "danger",
  needs_clarification: "warning",
  bid_submitted: "info",
  recommended: "success",
  selected: "success",
  not_selected: "neutral",
  declined: "danger",
  submitted: "info",
  accepted: "success",
  rejected: "danger",
  withdrawn: "neutral",
  expired: "danger",
};

function formatLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const tone = statusToneMap[status] ?? "neutral";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {formatLabel(status)}
    </span>
  );
}
