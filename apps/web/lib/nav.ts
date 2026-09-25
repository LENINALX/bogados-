import { Role } from "@prisma/client";

/** Enlaces de navegación para el staff de la firma según rol. */
export function staffLinks(role: Role) {
  const links = [
    { href: "/dashboard", label: role === "ADMIN" ? "Casos" : "Mis casos" },
    { href: "/tareas", label: "Mis plazos" },
  ];
  if (role === "ADMIN") links.push({ href: "/admin/usuarios", label: "Usuarios" });
  return links;
}
