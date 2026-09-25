"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    // El detalle de un caso pertenece a la sección de casos
    (href === "/dashboard" && pathname.startsWith("/casos"));

  return (
    <nav aria-label="Principal" className="-mb-px flex gap-1 overflow-x-auto">
      {links.map((l) => {
        const active = isActive(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
              active
                ? "border-brand-700 text-brand-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-brand-700"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
