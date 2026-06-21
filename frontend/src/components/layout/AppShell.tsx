"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navLinks = [
  { href: "/work-orders", label: "Work Orders" },
  { href: "/vendors", label: "Vendors" },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-tavi-navy/10 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <Link href="/" className="text-sm font-bold uppercase tracking-wide text-tavi-navy">
            Tavi
          </Link>
          <ul className="flex gap-8">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname?.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "text-xs font-semibold uppercase tracking-wide text-tavi-indigo"
                        : "text-xs font-semibold uppercase tracking-wide text-tavi-navy/60 hover:text-tavi-indigo"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
