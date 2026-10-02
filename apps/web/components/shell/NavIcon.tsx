import { Briefcase, CalendarDays, FilePlus, ListChecks, LucideProps, Users } from "lucide-react";
import type { NavIcon as NavIconName } from "@/lib/nav";

const ICONS: Record<NavIconName, React.ComponentType<LucideProps>> = {
  cases: Briefcase,
  agenda: CalendarDays,
  tasks: ListChecks,
  users: Users,
  request: FilePlus,
};

export function NavIcon({ name, ...props }: { name: NavIconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden {...props} />;
}
