import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalLayout } from "@/components/PortalLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseRequestBadge } from "@/components/CaseRequestBadge";
import { EmptyState } from "@/components/ui";
import { formatShortDay, formatTime } from "@/lib/appointments";
import { OPEN_CASE_REQUEST_STATES } from "@bogados/shared";

export default async function PortalPage() {
  const session = await requireRole("CLIENTE");
  const { tenantId, id: userId } = session.user;
  const [tenant, cases, sharedDocuments, nextAppointment] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } }),
    prisma.case.findMany({
      where: { tenantId, clientId: userId },
      include: { lawyer: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.document.count({
      where: { tenantId, sharedWithClient: true, case: { clientId: userId } },
    }),
    prisma.appointment.findFirst({
      where: {
        tenantId,
        clientId: userId,
        status: { in: ["pendiente", "confirmada"] },
        startsAt: { gte: new Date() },
      },
      include: {
        lawyer: { select: { name: true } },
        case: { select: { title: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  // La hora de la cita, en la del bufete: el servidor puede estar en otra zona (en la nube, UTC)
  const timeZone = tenant?.timezone ?? "America/Guayaquil";
  // Una solicitud sin aceptar no es todavía un caso activo: se cuenta solo como solicitud
  const isOpenRequest = (c: (typeof cases)[number]) =>
    c.requestState !== null && OPEN_CASE_REQUEST_STATES.includes(c.requestState);
  const pendingRequests = cases.filter(isOpenRequest).length;
  const activeCases = cases.filter(
    (c) => c.status !== "cerrado" && (c.requestState === null || c.requestState === "aceptada"),
  ).length;

  const firstName = session.user.name.split(" ")[0];

  return (
    <PortalLayout user={session.user}>
      <main className="page max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Hola, {firstName}</h1>
            <p className="page-subtitle">
              Todo lo importante de tus asuntos, en un solo lugar.
            </p>
          </div>
          <Link href="/portal/solicitar" className="btn-primary">
            + Solicitar un caso
          </Link>
        </div>

        <section aria-label="Resumen de tu actividad" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card border-t-2 border-t-brand-500 p-4">
            <div className="text-2xl font-semibold text-brand-900">{activeCases}</div>
            <div className="mt-1 text-xs text-slate-500">Casos activos</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-semibold text-brand-900">{sharedDocuments}</div>
            <div className="mt-1 text-xs text-slate-500">Documentos compartidos</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-semibold text-brand-900">{pendingRequests}</div>
            <div className="mt-1 text-xs text-slate-500">Solicitudes pendientes</div>
          </div>
          <Link
            href="/portal/citas"
            className="card min-w-0 p-4 transition hover:border-brand-400 hover:shadow-sm"
            title={nextAppointment ? `${nextAppointment.lawyer.name} · ${nextAppointment.case?.title ?? "Consulta general"}` : undefined}
          >
            {nextAppointment ? (
              <>
                <div className="truncate text-2xl font-semibold text-brand-900">
                  {formatShortDay(nextAppointment.startsAt.toISOString(), timeZone)}
                </div>
                <div className="mt-1 truncate text-xs text-slate-500">
                  Próxima cita · {formatTime(nextAppointment.startsAt.toISOString(), timeZone)}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-semibold text-slate-400">—</div>
                <div className="mt-1 text-xs text-slate-500">Sin citas · pedir una →</div>
              </>
            )}
          </Link>
        </section>

        {cases.length === 0 ? (
          <div className="card">
            <EmptyState
              title="Aún no tienes casos"
              hint="Solicita uno describiendo tu situación, o espera a que tu abogado abra un caso a tu nombre."
              action={{ href: "/portal/solicitar", label: "Solicitar un caso" }}
            />
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tus asuntos</h2>
              <span className="text-sm text-slate-400">{cases.length} en total</span>
            </div>
            <ul className="space-y-3">
              {cases.map((c) => {
                // Mientras la solicitud no esté aceptada, su estado es lo relevante para el cliente
                const request = c.requestState && c.requestState !== "aceptada" ? c.requestState : null;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/portal/casos/${c.id}`}
                      className="card group block p-4 transition hover:border-brand-500 hover:shadow-md sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-brand-900 group-hover:underline">{c.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {request
                              ? `Solicitado el ${c.createdAt.toLocaleDateString("es-EC")}`
                              : `Abogado: ${c.lawyer?.name ?? "Por asignar"} · Actualizado ${c.updatedAt.toLocaleDateString("es-EC")}`}
                          </div>
                        </div>
                        {request ? <CaseRequestBadge state={request} /> : <StatusBadge status={c.status} />}
                      </div>
                      <div className="mt-3 text-xs font-medium text-brand-700">Ver detalle →</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
    </PortalLayout>
  );
}
