import Link from "next/link";
import { ROLE_LABELS, UserRole } from "@bogados/shared";
import { SignOutButton } from "./SignOutButton";
import { NavLinks } from "./NavLinks";
import { NotificationBell } from "./NotificationBell";

type Props = {
  user: { name: string; role: string };
  links: { href: string; label: string }[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AppHeader({ user, links }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4">
        <Link href="/" className="py-3 text-lg font-bold text-brand-700">
          Bogados
        </Link>
        {/* En móvil el menú baja a una segunda fila con scroll horizontal */}
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:self-end">
          <NavLinks links={links} />
        </div>
        <div className="ml-auto flex items-center gap-3 py-2 text-sm">
          <NotificationBell role={user.role} />
          <div className="hidden text-right sm:block">
            <div className="font-medium text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-500">
              {ROLE_LABELS[user.role as UserRole] ?? user.role}
            </div>
          </div>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
            title={user.name}
            aria-hidden
          >
            {initials(user.name)}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
