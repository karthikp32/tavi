interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return <p className="py-8 text-center text-sm text-tavi-navy/50">{label}</p>;
}
