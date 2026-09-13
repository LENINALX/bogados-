import Link from "next/link";
import { ROLE_LABELS, UserRole } from "@bogados/shared";
import { SignOutButton } from "./SignOutButton";

type Props = {
  user: { name: string; role: string };
  links: { href: string; label: string }[];
};

export function AppHeader({ user, links }: Props) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-brand-700">
            Bogados
          </Link>
          <nav className="hidden gap-4 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-slate-600 hover:text-brand-700"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
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
