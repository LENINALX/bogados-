import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PortalLayout } from "@/components/PortalLayout";
import { CaseRequestForm } from "@/components/CaseRequestForm";

export default async function RequestCasePage() {
  const session = await requireRole("CLIENTE");
  return (
    <PortalLayout user={session.user}>
      <main className="page max-w-2xl">
        <nav aria-label="Ruta" className="mb-4 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/portal" className="hover:text-brand-700 hover:underline">
            Mis casos
          </Link>
          <span aria-hidden>/</span>
          <span className="text-slate-700">Solicitar un caso</span>
        </nav>
        <div className="mb-6">
          <h1 className="page-title">Solicitar un caso</h1>
          <p className="page-subtitle">
            Describe tu situación. El despacho revisará la solicitud y te avisará por email si la acepta.
          </p>
        </div>
        <CaseRequestForm />
      </main>
    </PortalLayout>
  );
}
