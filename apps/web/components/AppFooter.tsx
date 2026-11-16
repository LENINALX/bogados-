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
];

const collaborators = [
  { name: "Guzmán Chávez Gabriela Patricia", email: "gpgch1993@gmail.com" },
  { name: "Mejía Chamorro Marcelo Israel" },
  { name: "Plua Acosta Abigail Guadalupe", email: "AbigailPlua08@gmail.com" },
  { name: "Suarez Carrera Lenin Alexander", email: "Leninalexander2002@gmail.com" },
  { name: "Vélez Briones Jipson Jordan", email: "jipsonbriones2010@gmail.com" },
];

export function AppFooter() {
  return (
    <footer className="border-t border-slate-200/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-[1.5fr_1fr_1fr_1.5fr] sm:px-6 lg:px-8">
        <div className="max-w-xs">
          <BrandMark />
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Expedientes, documentos, citas y comunicación con tus clientes en un solo lugar.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold text-slate-900">{column.title}</h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-500 transition-colors hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Contacto de Colaboradores</h2>
          <ul className="mt-3 space-y-3">
            {collaborators.map(({ name, email }) => (
              <li key={name}>
                {email ? (
                  <a href={`mailto:${email}`} className="block text-sm text-slate-500 transition-colors hover:text-brand-700">
                    <span className="block">{name}</span>
                    <span className="block break-all text-xs">{email}</span>
                  </a>
                ) : (
                  <span className="block text-sm text-slate-500">{name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-slate-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Bogados · Gestión legal para tu firma</span>
          <span>Hecho en Ecuador</span>
        </div>
      </div>
    </footer>
  );
}
