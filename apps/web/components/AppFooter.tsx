import Link from "next/link";

const columns = [
  {
    title: "Sobre Bogados",
    links: [
      { label: "Nuestra plataforma", href: "/" },
      { label: "Gestión legal para firmas", href: "/" },
    ],
  },
  {
    title: "Sobre el sistema",
    links: [
      { label: "Casos y expedientes", href: "/dashboard" },
      { label: "Documentos seguros", href: "/dashboard" },
      { label: "Portal del cliente", href: "/portal" },
    ],
  },
  {
    title: "Funcionalidades",
    links: [
      { label: "Casos", href: "/dashboard" },
      { label: "Tareas y plazos", href: "/tareas" },
      { label: "Mensajes", href: "/dashboard" },
      { label: "Documentos", href: "/dashboard" },
    ],
  },
  {
    title: "Soporte",
    links: [
      { label: "Ayuda de acceso", href: "/login" },
      { label: "Privacidad", href: "/" },
      { label: "Contacto", href: "/" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold text-slate-800">{column.title}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-500 transition hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Bogados. Gestión legal para tu firma.</span>
          <span>Privacidad · Uso interno</span>
        </div>
      </div>
    </footer>
  );
}
