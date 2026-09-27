import { AppHeader } from "./AppHeader";

type Props = {
  user: { name: string; role: string };
  links: { href: string; label: string }[];
  children: React.ReactNode;
};

export function StaffLayout({ user, links, children }: Props) {
  return (
    <div className="min-h-screen">
      <AppHeader user={user} links={links} />
      {children}
    </div>
  );
}
