import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { FirmMark } from "@/components/FirmMark";

export type FirmContact = {
  name: string;
  slug: string;
  brandColor: string | null;
  logoVersion: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
};

/** «https://www.mifirma.ec/» → «www.mifirma.ec» */
function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Portal del cliente: con quién trabaja y cómo contactar con el despacho. Solo se muestra
 * lo que la firma configuró en Admin › Ajustes; sin datos de contacto, solo el nombre.
 */
export function FirmContactCard({ firm }: { firm: FirmContact }) {
  const items = [
    firm.contactPhone && {
      icon: Phone,
      label: firm.contactPhone,
      href: `tel:${firm.contactPhone.replace(/[^\d+]/g, "")}`,
    },
    firm.contactEmail && { icon: Mail, label: firm.contactEmail, href: `mailto:${firm.contactEmail}` },
    firm.website && { icon: Globe, label: displayUrl(firm.website), href: firm.website, external: true },
    firm.address && { icon: MapPin, label: firm.address },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href?: string; external?: boolean }[];

  return (
    <section aria-labelledby="despacho-title" className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <FirmMark name={firm.name} slug={firm.slug} logoVersion={firm.logoVersion} brandColor={firm.brandColor} size={40} />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tu despacho</p>
          <h2 id="despacho-title" className="truncate font-display text-lg text-slate-900">
            {firm.name}
          </h2>
        </div>
      </div>
      {items.length > 0 && (
        <ul className="grid gap-px border-t border-slate-900/[0.06] bg-slate-900/[0.06] sm:grid-cols-2">
          {items.map(({ icon: Icon, label, href, external }) => {
            const content = (
              <>
                <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 break-words">{label}</span>
              </>
            );
            return (
              <li key={label} className="bg-surface">
                {href ? (
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-900/[0.03] hover:text-brand-700 sm:px-5"
                  >
                    {content}
                  </a>
                ) : (
                  <p className="flex min-h-11 items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 sm:px-5">{content}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
