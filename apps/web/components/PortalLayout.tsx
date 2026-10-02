import { clientLinks } from "@/lib/nav";
import { AppShell } from "./shell/AppShell";

type Props = {
  user: { name: string; role: string };
  children: React.ReactNode;
};

export function PortalLayout({ user, children }: Props) {
  return (
    <AppShell user={user} links={clientLinks()}>
      {children}
    </AppShell>
  );
}
