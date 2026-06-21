import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-tavi-navy/20 px-6 py-10 text-center">
      <p className="text-sm font-medium text-tavi-navy/80">{title}</p>
      {description ? <p className="text-sm text-tavi-navy/50">{description}</p> : null}
      {action}
    </div>
  );
}
