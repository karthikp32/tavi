import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded-lg border border-tavi-navy/10 bg-white p-4 ${className ?? ""}`}>
      {children}
    </div>
  );
}
