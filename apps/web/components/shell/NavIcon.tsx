import { Briefcase, CalendarDays, CalendarOff, FilePlus, History, ListChecks, LucideProps, Settings2, ShieldCheck, Users } from "lucide-react";
import type { NavIcon as NavIconName } from "@/lib/nav";

const ICONS: Record<NavIconName, React.ComponentType<LucideProps>> = {
  cases: Briefcase,
  agenda: CalendarDays,
  tasks: ListChecks,
  users: Users,
  request: FilePlus,
  holidays: CalendarOff,
  security: ShieldCheck,
  activity: History,
  settings: Settings2,
};

export function NavIcon({ name, ...props }: { name: NavIconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden {...props} />;
}
