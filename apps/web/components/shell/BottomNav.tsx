"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem, isActiveLink } from "@/lib/nav";
import { NavIcon } from "./NavIcon";

/**
 * Pestañas inferiores (móvil): la misma píldora oscura del riel de escritorio, flotando
 * al alcance del pulgar y por encima del área segura del iPhone.
 */
export function BottomNav({ links, counts = {} }: { links: NavItem[]; counts?: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 pb-3 lg:hidden">
      <ul className="mx-auto flex max-w-md gap-1 rounded-[18px] bg-rail p-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_18px_40px_-12px_rgb(10_9_7/0.55)]">
        {links.map((l) => {
          const active = isActiveLink(l.href, pathname);
          const count = counts[l.href];
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rail-key relative flex flex-col items-center gap-0.5 rounded-[18px] px-2 py-2 text-[11px] font-medium ${
                  active ? "rail-key-active text-white" : "text-white/55"
                }`}
              >
                <NavIcon name={l.icon} className="h-5 w-5" strokeWidth={active ? 2.1 : 1.8} />
                {l.label}
                {!!count && (
                  <span className="absolute right-[18%] top-1 min-w-[1rem] rounded-full bg-white/90 px-1 text-center text-[9.5px] font-bold leading-4 text-rail">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
