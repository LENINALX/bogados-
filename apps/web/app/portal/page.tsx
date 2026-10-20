import Link from "next/link";
import { CalendarClock, CalendarPlus, ChevronRight, FolderOpen, Plus } from "lucide-react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PortalLayout } from "@/components/PortalLayout";
import { CaseRow } from "@/components/portal/CaseRow";
import { EmptyState } from "@/components/ui";
import { StateBadge } from "@/components/portal/StateBadge";
import { formatShortDay, formatTime } from "@/lib/appointments";
import { OPEN_CASE_REQUEST_STATES } from "@bogados/shared";

/** "13 oct" (o "13 oct 2025" si no es de este año), en la zona del bufete */
function shortDate(date: Date, timeZone: string) {
  const sameYear =
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(date) ===
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(new Date());
  return new Intl.DateTimeFormat("es-EC", {
    timeZone,
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  })
    .format(date)
    .replace(/\./g, "");
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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

  // Asuntos (creados por el despacho o solicitudes ya aceptadas) y solicitudes aún sin aceptar.
  // Los cerrados van al final: lo que sigue en marcha es lo que el cliente busca primero.
  const isMatter = (c: (typeof cases)[number]) => c.requestState === null || c.requestState === "aceptada";
  const matters = cases
    .filter(isMatter)
    .sort((a, b) => Number(a.status === "cerrado") - Number(b.status === "cerrado"));
  const requests = cases.filter((c) => !isMatter(c));

  const firstName = session.user.name.split(" ")[0];
  const summary =
    activeCases === 0 && pendingRequests === 0
      ? "Aquí verás tus asuntos, tus citas y lo que te comparta tu abogado."
      : [
          activeCases > 0 && `Tienes ${plural(activeCases, "asunto en curso", "asuntos en curso")}`,
          pendingRequests > 0 &&
            `${activeCases > 0 ? "y" : "Tienes"} ${plural(pendingRequests, "solicitud en revisión", "solicitudes en revisión")}`,
        ]
          .filter(Boolean)
          .join(" ") + ".";

  return (
    <PortalLayout user={session.user}>
      <main className="page max-w-3xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="page-title">Hola, {firstName}</h1>
            <p className="page-subtitle">{summary}</p>
          </div>
          <Link href="/portal/solicitar" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            Solicitar un caso
          </Link>
        </header>

        <section aria-label="Resumen de tu actividad" className="mb-10 grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <dl className="card grid grid-cols-3 divide-x divide-slate-900/[0.06]">
            <Stat value={activeCases} label="Asuntos en curso" />
            <Stat value={pendingRequests} label="Solicitudes en revisión" />
            <Stat value={sharedDocuments} label="Documentos compartidos" />
          </dl>

          <Link
            href="/portal/citas"
            className="card group flex min-w-0 items-center gap-3 px-4 py-4 transition-[border-color,box-shadow] duration-150 ease-[var(--ease-premium)] hover:border-slate-900/[0.16] sm:px-5"
          >
            {nextAppointment ? (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    Próxima cita
                  </span>
                  {nextAppointment.status === "pendiente" ? (
                    <StateBadge tone="amber">Por confirmar</StateBadge>
                  ) : (
                    <StateBadge tone="emerald">Confirmada</StateBadge>
                  )}
                </div>
                <p className="mt-2 font-display text-[1.5rem] font-medium leading-none tracking-[-0.015em] text-slate-900">
                  <time dateTime={nextAppointment.startsAt.toISOString()}>
                    <span className="capitalize">{formatShortDay(nextAppointment.startsAt.toISOString(), timeZone)}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="tabular-nums">{formatTime(nextAppointment.startsAt.toISOString(), timeZone)}</span>
                  </time>
                </p>
                <p className="mt-2 truncate text-[13px] text-slate-600">
                  Con {nextAppointment.lawyer.name} · {nextAppointment.case?.title ?? "Consulta general"}
                </p>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
                  <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                  Sin citas programadas
                </span>
                <p className="mt-2 text-[0.9375rem] font-medium text-slate-900">Pide una cita con tu abogado</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Eliges el día y la hora que te vengan bien.</p>
              </div>
            )}
            <ChevronRight
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ease-[var(--ease-premium)] group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </section>

        {cases.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FolderOpen}
              title="Aún no tienes asuntos"
              hint="Cuéntanos tu situación y el despacho la revisará. Si tu abogado abre un caso a tu nombre, también aparecerá aquí."
              action={{ href: "/portal/solicitar", label: "Solicitar un caso" }}
            />
          </div>
        ) : (
          <div className="space-y-10">
            {matters.length > 0 && (
              <section aria-labelledby="asuntos-title">
                <SectionHeading id="asuntos-title" title="Tus asuntos" count={matters.length} />
                <ul className="card divide-y divide-slate-900/[0.06] overflow-hidden">
                  {matters.map((c, i) => (
                    <CaseRow
                      key={c.id}
                      index={i}
                      href={`/portal/casos/${c.id}`}
                      title={c.title}
                      status={c.status}
                      request={null}
                      meta={`${c.lawyer?.name ?? "Abogado por asignar"} · Actualizado el ${shortDate(c.updatedAt, timeZone)}`}
                    />
                  ))}
                </ul>
              </section>
            )}

            {requests.length > 0 && (
              <section aria-labelledby="solicitudes-title">
                <SectionHeading
                  id="solicitudes-title"
                  title="Tus solicitudes"
                  count={requests.length}
                  hint="Cuando el despacho acepta una solicitud, pasa a tus asuntos con un abogado asignado."
                />
                <ul className="card divide-y divide-slate-900/[0.06] overflow-hidden">
                  {requests.map((c, i) => (
                    <CaseRow
                      key={c.id}
                      index={matters.length + i}
                      href={`/portal/casos/${c.id}`}
                      title={c.title}
                      status={c.status}
                      request={c.requestState}
                      meta={`Enviada el ${shortDate(c.createdAt, timeZone)}`}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </PortalLayout>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end px-3 py-4 sm:px-5">
      <dt className="mt-1.5 text-xs leading-snug text-slate-500 sm:text-[13px]">{label}</dt>
      <dd className="font-display text-[2rem] font-medium leading-none tracking-[-0.02em] text-slate-900 tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function SectionHeading({ id, title, count, hint }: { id: string; title: string; count: number; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="flex items-baseline gap-2 font-display text-[1.375rem] font-medium tracking-[-0.015em] text-slate-900">
        {title}
        <span className="font-sans text-[13px] font-normal tracking-normal tabular-nums text-slate-400">{count}</span>
      </h2>
      {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
    </div>
  );
}
