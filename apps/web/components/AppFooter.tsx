import Link from "next/link";
import { BrandMark } from "./shell/BrandMark";

/** Pie institucional de la web pública. Enlaces a secciones reales de la página y al acceso. */
const columns = [
  {
    title: "Plataforma",
    links: [
      { label: "Funcionalidades", href: "/#funciones" },
      { label: "Cómo funciona", href: "/#como-funciona" },
      { label: "Seguridad", href: "/#seguridad" },
    ],
  },
  {
    title: "Acceso",
    links: [
      { label: "Iniciar sesión", href: "/login" },
      { label: "Registrar mi despacho", href: "/registro" },
      { label: "Recuperar contraseña", href: "/recuperar" },
    ],
  },
  {
    title: "Contacto de colaboradores",
    links: [
      { label: "jipsonbriones2010@gmail.com", href: "mailto:jipsonbriones2010@gmail.com" },
      { label: "gpgch1993@gmail.com", href: "mailto:gpgch1993@gmail.com" },
      { label: "AbigailPlua08@gmail.com", href: "mailto:AbigailPlua08@gmail.com" },
      { label: "Leninalexander2002@gmail.com", href: "mailto:Leninalexander2002@gmail.com" },
    ],
  },
];

export function AppFooter() {
  return (
    <footer className="border-t border-slate-900/[0.08] bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1.5fr_1fr_1fr_1.5fr] sm:px-6 lg:px-8">
        <div className="max-w-xs">
          <BrandMark />
          <p className="mt-4 font-display text-[1.0625rem] leading-snug text-slate-700">
            Cada término, <em className="italic text-red-700">a&nbsp;tiempo.</em>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            Casos, plazos, documentos, citas y el portal de tus clientes en un solo lugar.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-[13px] font-medium text-slate-500">{column.title}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-700 [overflow-wrap:anywhere] transition-colors duration-150 hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-900/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Bogados · Gestión legal para tu firma</span>
          <span>Hecho en Ecuador</span>
        </div>
      </div>
    </footer>
  );
}
