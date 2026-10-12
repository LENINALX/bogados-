import { cookies } from "next/headers";
import { NavItem } from "@/lib/nav";
import { getShellData } from "@/lib/shell-data";
import { SIDEBAR_COOKIE } from "@/lib/shell-prefs";
import { ShellFrame } from "./ShellFrame";

export type ShellSessionUser = { id: string; name: string; email: string; role: string; tenantId: string };

/**
 * Armazón de la aplicación (despacho y portal). En el servidor carga los recuentos de la
 * barra lateral y lee la cookie de plegado, para pintar el estado correcto sin parpadeo.
 */
export async function AppShell({
  user,
  links,
  children,
}: {
  user: ShellSessionUser;
  links: NavItem[];
  children: React.ReactNode;
}) {
  const data = await getShellData(user);
  const collapsed = cookies().get(SIDEBAR_COOKIE)?.value === "1";
  return (
    <ShellFrame
      user={{ name: user.name, email: user.email, role: user.role }}
      links={links}
      data={data}
      home={links[0]?.href ?? "/"}
      variant={user.role === "CLIENTE" ? "portal" : "despacho"}
      initialCollapsed={collapsed}
    >
      {children}
    </ShellFrame>
  );
}
