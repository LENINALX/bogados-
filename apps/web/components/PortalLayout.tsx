import Link from "next/link";
import { clientLinks } from "@/lib/nav";
import { AppShell, ShellSessionUser } from "./shell/AppShell";

type Props = {
  user: ShellSessionUser;
  children: React.ReactNode;
};

export function PortalLayout({ user, children }: Props) {
  return (
    <AppShell user={user} links={clientLinks()}>
      <>
        {children}
        <footer className="mx-auto mt-8 flex max-w-6xl justify-end px-4 pb-8 sm:px-6 lg:px-8">
          <Link href="/privacidad" className="text-sm text-slate-500 underline-offset-4 hover:text-brand-700 hover:underline">
            Política de privacidad
          </Link>
        </footer>
      </>
    </AppShell>
  );
}
