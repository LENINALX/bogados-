import Link from "next/link";
import { ROLE_LABELS, UserRole } from "@bogados/shared";
import { SignOutButton } from "./SignOutButton";
import { NotificationBell } from "./NotificationBell";
import { NavLinks } from "./NavLinks";

type Props = {
  user: { name: string; role: string };
  links: { href: string; label: string }[];
};

export function AppHeader({ user, links }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 pt-2 sm:pt-0">
        <Link href="/" className="py-2 text-lg font-bold text-brand-700 sm:py-3">
          Bogados
        </Link>
        {/* En móvil el menú baja a una segunda fila con scroll horizontal */}
        <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:self-end">
          <NavLinks links={links} />
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <NotificationBell role={user.role} />
          <div className="hidden text-right sm:block">
            <div className="font-medium text-slate-800">{user.name}</div>
            <div className="text-xs text-slate-500">
              {ROLE_LABELS[user.role as UserRole] ?? user.role}
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
