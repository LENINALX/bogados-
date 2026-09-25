/** Esqueleto genérico mientras carga una página (header + título + tarjetas). */
export default function Loading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="h-[52px] border-b border-slate-200 bg-white" />
      <div className="page space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-7 w-56" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="card space-y-3 p-5">
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
