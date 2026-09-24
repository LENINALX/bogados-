"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-lg font-semibold text-slate-800">No se pudo cargar esta página</h1>
      <p className="mt-2 text-sm text-slate-500">Comprueba la conexión e inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
      >
        Reintentar
      </button>
    </div>
  );
}