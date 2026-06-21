"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { clearSession, getSession, homePathForSession, type Session } from "@/lib/auth";

const navLinksByType: Record<Session["type"], { href: string; label: string }[]> = {
  facility_manager: [
    { href: "/work-orders", label: "Work Orders" },
    { href: "/vendors", label: "Vendors" },
  ],
  vendor: [{ href: "/vendor/marketplace", label: "Marketplace" }],
};

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [session] = useState<Session | null>(() => getSession());

  const navLinks = session ? navLinksByType[session.type] : [];
  const brandHref = session ? homePathForSession(session) : "/";

  function handleLogout() {
    clearSession();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-tavi-navy/10 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <div className="flex items-center gap-6">
            <Link href={brandHref} className="text-sm font-bold uppercase tracking-wide text-tavi-navy">
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
          </div>
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-tavi-navy/70">{session.name}</span>
              <Button variant="secondary" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          ) : null}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
