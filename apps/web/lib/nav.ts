import { Role } from "@prisma/client";

/** Nombre del icono (se resuelve en el cliente: los componentes no viajan del servidor) */
export type NavIcon = "cases" | "agenda" | "tasks" | "users" | "request" | "holidays" | "security";

export type NavItem = { href: string; label: string; icon: NavIcon };

/** Navegación del despacho según rol. Etiquetas específicas, no genéricas. */
export function staffLinks(role: Role): NavItem[] {
  const links: NavItem[] = [
    { href: "/dashboard", label: role === "ADMIN" ? "Casos" : "Mis casos", icon: "cases" },
    { href: "/agenda", label: "Agenda", icon: "agenda" },
    { href: "/tareas", label: "Plazos", icon: "tasks" },
  ];
  if (role === "ADMIN") {
    links.push({ href: "/admin/usuarios", label: "Usuarios", icon: "users" });
    // Días no hábiles: de ellos depende el cálculo de los términos
    links.push({ href: "/admin/feriados", label: "Feriados", icon: "holidays" });
    // Quién entró y desde dónde; política de verificación en dos pasos
    links.push({ href: "/admin/accesos", label: "Accesos", icon: "security" });
  }
  return links;
}

/** Navegación del portal del cliente. */
export function clientLinks(): NavItem[] {
  return [
    { href: "/portal", label: "Mis casos", icon: "cases" },
    { href: "/portal/citas", label: "Citas", icon: "agenda" },
    { href: "/portal/solicitar", label: "Solicitar", icon: "request" },
  ];
}

/** id del listado de casos del panel: los filtros enlazan a `/dashboard?…#casos` para llevar hasta él */
export const CASES_LIST_ID = "casos";

/** Enlace al listado del panel filtrado por estado (barra lateral y gráficas) */
export function casesByStatusHref(status: string): string {
  return `/dashboard?status=${encodeURIComponent(status)}#${CASES_LIST_ID}`;
}

/** ¿Está activo el enlace en esta ruta? El detalle de un caso pertenece a "Casos". */
export function isActiveLink(href: string, pathname: string): boolean {
  if (href === "/portal") return pathname === "/portal" || pathname.startsWith("/portal/casos");
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/casos");
  return pathname === href || pathname.startsWith(`${href}/`);
}
