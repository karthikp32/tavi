interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return <p className="py-8 text-center text-sm text-zinc-500">{label}</p>;
}
