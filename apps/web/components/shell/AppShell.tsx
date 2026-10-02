import { NavItem } from "@/lib/nav";
import { NotificationBell } from "../NotificationBell";
import { BottomNav } from "./BottomNav";
import { BrandMark } from "./BrandMark";
import { SideNav } from "./SideNav";
import { UserMenu } from "./UserMenu";

/**
 * Armazón de la aplicación (despacho y portal):
 * - escritorio: barra lateral + barra superior translúcidas
 * - móvil: barra superior compacta + pestañas inferiores
 */
export function AppShell({
  user,
  links,
  children,
}: {
  user: { name: string; role: string };
  links: NavItem[];
  children: React.ReactNode;
}) {
  const home = links[0]?.href ?? "/";
  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-lg bg-surface px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Saltar al contenido
      </a>
      <SideNav links={links} home={home} />

      <header className="material sticky top-0 z-30 border-b border-slate-200/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="lg:hidden">
            <BrandMark href={home} />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell role={user.role} />
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      {/* pb en móvil: deja sitio a las pestañas inferiores */}
      <div id="contenido" className="pb-24 lg:pb-8">
        {children}
      </div>

      <BottomNav links={links} />
    </div>
  );
}
