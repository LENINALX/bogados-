import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { staffLinks } from "@/lib/nav";
import { StaffLayout } from "@/components/StaffLayout";
import { HolidaysManager } from "@/components/HolidaysManager";

/**
 * Calendario de días no hábiles del bufete. Los términos procesales los saltan, así que
 * de esta lista depende que los vencimientos calculados sean correctos.
 */
export default async function HolidaysPage({ searchParams }: { searchParams: { anio?: string } }) {
  const session = await requireRole("ADMIN");
  const { tenantId } = session.user;

  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { timezone: true } });
  const currentYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: tenant.timezone, year: "numeric" }).format(new Date()));
  const requested = Number.parseInt(searchParams.anio ?? "", 10);
  const year = requested >= 2000 && requested <= 2100 ? requested : currentYear;

  const holidays = await prisma.holiday.findMany({
    where: { tenantId, date: { gte: new Date(`${year}-01-01T00:00:00Z`), lte: new Date(`${year}-12-31T00:00:00Z`) } },
    orderBy: { date: "asc" },
    select: { id: true, date: true, name: true },
  });

  return (
    <StaffLayout user={session.user} links={staffLinks("ADMIN")}>
      <main className="page">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Feriados</h1>
            <p className="page-subtitle max-w-2xl">
              Días no hábiles de la firma. Los términos en días hábiles los saltan al calcular el vencimiento, así que
              mantén aquí los traslados del año y los feriados locales.
            </p>
          </div>
          <nav aria-label="Año" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-surface p-1">
            <Link href={`/admin/feriados?anio=${year - 1}`} className="btn-ghost btn-sm h-8 w-8 p-0" aria-label={`Año ${year - 1}`}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
            <span className="min-w-[4rem] text-center text-sm font-semibold tabular-nums text-slate-900">{year}</span>
            <Link href={`/admin/feriados?anio=${year + 1}`} className="btn-ghost btn-sm h-8 w-8 p-0" aria-label={`Año ${year + 1}`}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>
        </div>

        <HolidaysManager
          year={year}
          initial={holidays.map((h) => ({ id: h.id, name: h.name, date: h.date.toISOString().slice(0, 10) }))}
        />
      </main>
    </StaffLayout>
  );
}
