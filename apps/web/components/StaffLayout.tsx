import { NavItem } from "@/lib/nav";
import { AppShell, ShellSessionUser } from "./shell/AppShell";

type Props = {
  user: ShellSessionUser;
  links: NavItem[];
  children: React.ReactNode;
};

export function StaffLayout({ user, links, children }: Props) {
  return (
    <AppShell user={user} links={links}>
      {children}
    </AppShell>
  );
}
