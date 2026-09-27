import { AppHeader } from "./AppHeader";
import { AppFooter } from "./AppFooter";

type Props = {
  user: { name: string; role: string };
  children: React.ReactNode;
};

export function PortalLayout({ user, children }: Props) {
  return (
    <div className="min-h-screen">
      <AppHeader user={user} links={[{ href: "/portal", label: "Mis casos" }]} />
      {children}
      <AppFooter />
    </div>
  );
}
