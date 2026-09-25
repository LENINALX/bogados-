import Link from "next/link";
import { Prisma, Role } from "@prisma/client";
import { ROLE_LABELS, USER_ROLES } from "@bogados/shared";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { AppHeader } from "@/components/AppHeader";
import { InviteUserForm, UserRowControls } from "@/components/UserAdmin";

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: { role?: string; q?: string; estado?: string };
}) {
  const session = await requireRole("ADMIN");
  const { tenantId, id: userId } = session.user;

  const role = USER_ROLES.includes(searchParams.role as Role) ? (searchParams.role as Role) : undefined;
  const q = searchParams.q?.trim();
  const estado = searchParams.estado === "inactivos" ? false : searchParams.estado === "activos" ? true : undefined;

  const where: Prisma.UserWhereInput = { tenantId };
  if (role) where.role = role;
  if (estado !== undefined) where.active = estado;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [users, counts] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: { select: { casesAsLawyer: true, casesAsClient: true } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.user.groupBy({ by: ["role"], where: { tenantId }, _count: true }),
  ]);

  const countFor = (r: Role) => counts.find((c) => c.role === r)?._count ?? 0;
  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { role, q, estado: searchParams.estado, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return `/admin/usuarios${s ? `?${s}` : ""}`;
  };

  return (
    <div className="min-h-screen">
      <AppHeader user={session.user} links={staffLinks("ADMIN")} />
      <main className="page">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Usuarios de la firma</h1>
            <p className="text-sm text-slate-500">
              {USER_ROLES.map((r) => `${countFor(r)} ${ROLE_LABELS[r].toLowerCase()}${countFor(r) === 1 ? "" : "s"}`).join(" · ")}
            </p>
          </div>
          <InviteUserForm />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={href({ role: undefined })}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${!role ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-700"}`}
          >
            Todos
          </Link>
          {USER_ROLES.map((r) => (
            <Link
              key={r}
              href={href({ role: r })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${role === r ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-500"}`}
            >
              {ROLE_LABELS[r]} ({countFor(r)})
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          {[
            ["activos", "Activos"],
            ["inactivos", "Inactivos"],
          ].map(([v, label]) => (
            <Link
              key={v}
              href={href({ estado: searchParams.estado === v ? undefined : v })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${searchParams.estado === v ? "border-brand-700 bg-brand-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-500"}`}
            >
              {label}
            </Link>
          ))}
          <form className="ml-auto">
            {role && <input type="hidden" name="role" value={role} />}
            {searchParams.estado && <input type="hidden" name="estado" value={searchParams.estado} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar nombre o email…"
              className="w-64 max-w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
          </form>
        </div>

        <div className="overflow-x-auto card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Casos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Alta</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No hay usuarios con estos filtros
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className={`border-b last:border-0 ${u.active ? "" : "bg-slate-50 text-slate-400"}`}>
                  <td className="px-4 py-3">
                    <div className={`font-medium ${u.active ? "text-slate-800" : ""}`}>
                      {u.name}
                      {u.id === userId && <span className="ml-2 text-xs font-normal text-slate-400">(tú)</span>}
                    </div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.role === "CLIENTE" ? u._count.casesAsClient : u._count.casesAsLawyer}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {u.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.createdAt.toLocaleDateString("es-EC")}</td>
                  <td className="px-4 py-3">
                    <UserRowControls userId={u.id} role={u.role} active={u.active} isSelf={u.id === userId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
