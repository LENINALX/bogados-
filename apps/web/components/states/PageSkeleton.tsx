import { cookies } from "next/headers";
import { SIDEBAR_COOKIE } from "@/lib/shell-prefs";

export type SkeletonLayout = "list" | "detail" | "agenda" | "form";

/**
 * Esqueleto de una página interna mientras carga: misma forma que el armazón real
 * (riel oscuro, barra lateral si no está plegada, barra superior y pestañas en móvil)
 * y un contenido con la forma aproximada de la página, para que nada salte al aparecer.
 * Lo usan los `loading.tsx` de cada sección; la portada conserva el suyo.
 */
export function PageSkeleton({ layout = "list", label = "Cargando…" }: { layout?: SkeletonLayout; label?: string }) {
  const collapsed = cookies().get(SIDEBAR_COOKIE)?.value === "1";
  return (
    <div data-collapsed={collapsed} className="app-shell min-h-dvh bg-shell" aria-busy="true">
      <p role="status" className="sr-only">
        {label}
      </p>

      {/* Escritorio: riel + barra lateral */}
      <div aria-hidden className="fixed inset-y-0 left-0 z-40 hidden gap-3 p-3 lg:flex">
        <div className="flex w-[4.25rem] flex-col items-center gap-2 rounded-[18px] bg-rail px-1.5 py-2.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-11 w-11 animate-pulse rounded-xl bg-white/[0.07]" />
          ))}
        </div>
        <div className="app-sidebar shell-panel hidden w-72 flex-col gap-3 rounded-[18px] p-4 xl:flex">
          <div className="flex items-center gap-3">
            <div className="skeleton h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3.5 w-28" />
              <div className="skeleton h-3 w-36" />
            </div>
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-9 w-full rounded-[14px]" />
          ))}
        </div>
      </div>

      {/* Móvil: barra superior */}
      <div aria-hidden className="material sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/70 px-4 sm:px-6 lg:hidden">
        <div className="skeleton h-8 w-28 rounded-[10px]" />
        <div className="skeleton ml-auto h-8 w-8 rounded-full" />
      </div>

      <div aria-hidden className="app-main pb-28 lg:pb-10">
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="space-y-2.5">
            <div className="skeleton h-8 w-64 max-w-full" />
            <div className="skeleton h-4 w-80 max-w-full" />
          </div>
          <SkeletonBody layout={layout} />
        </div>
      </div>
    </div>
  );
}

function Rows({ count }: { count: number }) {
  return (
    <div className="divide-y divide-slate-900/[0.06]">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-3.5" style={{ width: `${62 - ((i * 11) % 28)}%` }} />
            <div className="skeleton h-3 w-32" />
          </div>
          <div className="skeleton hidden h-3.5 w-24 sm:block" />
          <div className="skeleton h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function Card({ rows, className = "" }: { rows: number; className?: string }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="card-header">
        <div className="skeleton h-4 w-36" />
      </div>
      <Rows count={rows} />
    </div>
  );
}

function SkeletonBody({ layout }: { layout: SkeletonLayout }) {
  if (layout === "detail") {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card rows={3} />
          <Card rows={4} />
        </div>
        <div className="space-y-6">
          <Card rows={2} />
          <Card rows={3} />
        </div>
      </div>
    );
  }
  if (layout === "agenda") {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card rows={5} className="lg:col-span-2" />
        <div className="space-y-6">
          <div className="skeleton h-10 w-full rounded-[10px]" />
          <Card rows={3} />
        </div>
      </div>
    );
  }
  if (layout === "form") {
    return (
      <div className="card max-w-2xl space-y-5 p-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-3.5 w-28" />
            <div className="skeleton h-10 w-full rounded-[10px]" />
          </div>
        ))}
        <div className="skeleton h-10 w-36 rounded-[10px]" />
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-8 w-24 rounded-lg" />
        ))}
      </div>
      <Card rows={6} />
    </>
  );
}
