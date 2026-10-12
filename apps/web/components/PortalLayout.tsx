import { clientLinks } from "@/lib/nav";
import { AppShell, ShellSessionUser } from "./shell/AppShell";

type Props = {
  user: ShellSessionUser;
  children: React.ReactNode;
};

export function PortalLayout({ user, children }: Props) {
  return (
    <AppShell user={user} links={clientLinks()}>
      {children}
    </AppShell>
  );
}
