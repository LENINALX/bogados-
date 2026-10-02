"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem, isActiveLink } from "@/lib/nav";
import { NavIcon } from "./NavIcon";

/** Pestañas inferiores (móvil): al alcance del pulgar, sobre el área segura del iPhone. */
export function BottomNav({ links }: { links: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="material pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {links.map((l) => {
          const active = isActiveLink(l.href, pathname);
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-2 pb-2 pt-2.5 text-[11px] font-medium transition-[color,transform] duration-150 ease-out active:scale-95 ${
                  active ? "text-brand-700" : "text-slate-500"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 ${
                    active ? "bg-brand-100/70" : ""
                  }`}
                >
                  <NavIcon name={l.icon} className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
