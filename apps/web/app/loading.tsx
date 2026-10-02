/** Esqueleto mientras carga una página: misma forma que el armazón, sin saltos al aparecer. */
export default function Loading() {
  return (
    <div className="min-h-dvh lg:pl-64" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200/70 bg-surface/75 lg:block">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="skeleton h-8 w-8 rounded-[10px]" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="space-y-2 px-3 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="h-14 border-b border-slate-200/70 bg-surface/75 lg:h-16" />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-2">
          <div className="skeleton h-7 w-56" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-7 w-12" />
            </div>
          ))}
        </div>
        <div className="card space-y-4 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
