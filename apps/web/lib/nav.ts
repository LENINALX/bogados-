import { Role } from "@prisma/client";

/** Nombre del icono (se resuelve en el cliente: los componentes no viajan del servidor) */
export type NavIcon = "cases" | "agenda" | "tasks" | "users" | "request";

export type NavItem = { href: string; label: string; icon: NavIcon };

/** Navegación del despacho según rol. Etiquetas específicas, no genéricas. */
export function staffLinks(role: Role): NavItem[] {
  const links: NavItem[] = [
    { href: "/dashboard", label: role === "ADMIN" ? "Casos" : "Mis casos", icon: "cases" },
    { href: "/agenda", label: "Agenda", icon: "agenda" },
    { href: "/tareas", label: "Plazos", icon: "tasks" },
  ];
  if (role === "ADMIN") links.push({ href: "/admin/usuarios", label: "Usuarios", icon: "users" });
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

/** ¿Está activo el enlace en esta ruta? El detalle de un caso pertenece a "Casos". */
export function isActiveLink(href: string, pathname: string): boolean {
  if (href === "/portal") return pathname === "/portal" || pathname.startsWith("/portal/casos");
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/casos");
  return pathname === href || pathname.startsWith(`${href}/`);
}
