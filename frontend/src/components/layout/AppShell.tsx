import Link from "next/link";
import type { ReactNode } from "react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/work-orders", label: "Work Orders" },
  { href: "/vendors", label: "Vendors" },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-tavi-pale-blue/40">
      <header className="border-b border-tavi-navy/10 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
          <span className="text-sm font-semibold text-tavi-navy">Tavi</span>
          <ul className="flex gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-tavi-navy/70 hover:text-tavi-indigo"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
