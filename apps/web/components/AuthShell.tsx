/** Marco de las pantallas sin sesión: login, recuperar y restablecer contraseña. */
export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-lg font-bold text-white shadow-sm">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-900">Bogados</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión legal para tu firma</p>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="mb-5 text-lg font-semibold text-slate-800">{title}</h2>
          {children}
        </div>

        {footer}
      </div>
    </div>
  );
}
