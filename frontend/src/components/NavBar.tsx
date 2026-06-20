import Link from "next/link";

const LINKS = [
  { href: "/", label: "Tavi" },
  { href: "/work-orders", label: "Dashboard" },
  { href: "/work-orders/new", label: "New Work Order" },
  { href: "/vendors", label: "Vendors" },
];

export function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="text-base font-semibold text-slate-900">
          Tavi
        </Link>
        <div className="flex gap-4 text-sm text-slate-600">
          {LINKS.slice(1).map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
