import Link from "next/link";

/** 404 en español (también se usa cuando un caso no existe o no tienes acceso). */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold text-brand-100">404</p>
      <h1 className="mt-2 text-lg font-semibold text-slate-800">No encontramos lo que buscas</h1>
      <p className="mt-2 text-sm text-slate-500">
        El caso o la página no existe, o no tienes permiso para verla.
      </p>
      <Link href="/" className="btn-primary mt-5">
        Volver al inicio
      </Link>
    </div>
  );
}
