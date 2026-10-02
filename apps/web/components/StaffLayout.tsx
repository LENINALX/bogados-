import { NavItem } from "@/lib/nav";
import { AppShell } from "./shell/AppShell";

type Props = {
  user: { name: string; role: string };
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
