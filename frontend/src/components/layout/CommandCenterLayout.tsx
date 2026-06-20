import type { ReactNode } from "react";

interface CommandCenterLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

export function CommandCenterLayout({ left, center, right }: CommandCenterLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_320px]">
      <div className="flex flex-col gap-4">{left}</div>
      <div className="flex flex-col gap-4">{center}</div>
      <div className="flex flex-col gap-4">{right}</div>
    </div>
  );
}
