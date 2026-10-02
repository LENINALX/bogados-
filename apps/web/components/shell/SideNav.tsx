"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem, isActiveLink } from "@/lib/nav";
import { NavIcon } from "./NavIcon";
import { BrandMark } from "./BrandMark";

/** Barra lateral (escritorio): material translúcido, el contenido pasa por debajo. */
export function SideNav({ links, home }: { links: NavItem[]; home: string }) {
  const pathname = usePathname();
  return (
    <aside className="material fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200/70 lg:flex">
      <div className="flex h-16 items-center px-5">
        <BrandMark href={home} />
      </div>
      <nav aria-label="Principal" className="flex-1 space-y-0.5 px-3 py-2">
        {links.map((l) => {
          const active = isActiveLink(l.href, pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-brand-100/70 font-semibold text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70"
              }`}
            >
              <NavIcon
                name={l.icon}
                className={`h-[18px] w-[18px] transition-colors ${active ? "text-brand-700" : "text-slate-400 group-hover:text-slate-600"}`}
                strokeWidth={active ? 2.2 : 1.9}
              />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <p className="px-5 py-4 text-[11px] text-slate-400">© {new Date().getFullYear()} Bogados</p>
    </aside>
  );
}
