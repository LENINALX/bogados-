"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { nestPublicFetch, NestApiError } from "@/lib/nest-api";
import { normalizeFirmSlug } from "@/lib/firm-memory";
import { Spinner } from "../ui";
import { AuthField } from "./AuthField";
import { applyFilter, filters } from "@/lib/input-filters";
import { FirmMark } from "../FirmMark";

export type FirmLookup =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "found"; name: string; logoVersion: number | null; brandColor: string | null }
  | { state: "missing" }
  /** Sin conexión con la API: no se bloquea el envío, ya responderá el login */
  | { state: "error" };

const SLUG = /^[a-z0-9-]{2,60}$/;

/** Comprueba el código de firma mientras se escribe y trae su nombre. */
export function useFirmLookup(rawSlug: string, enabled = true): FirmLookup {
  const [lookup, setLookup] = useState<FirmLookup>({ state: "idle" });
  const seq = useRef(0);

  useEffect(() => {
    const slug = normalizeFirmSlug(rawSlug);
    const id = ++seq.current;
    if (!enabled || !slug) {
      setLookup({ state: "idle" });
      return;
    }
    if (!SLUG.test(slug)) {
      setLookup({ state: "missing" });
      return;
    }
    setLookup({ state: "checking" });
    const t = setTimeout(() => {
      nestPublicFetch<PublicFirm>(`/tenants/public/${encodeURIComponent(slug)}`)
        .then(
          (firm) =>
            id === seq.current &&
            setLookup({ state: "found", name: firm.name, logoVersion: firm.logoVersion ?? null, brandColor: firm.brandColor ?? null }),
        )
        .catch((err) => {
          if (id !== seq.current) return;
          setLookup(err instanceof NestApiError && err.status === 404 ? { state: "missing" } : { state: "error" });
        });
    }, 350);
    return () => clearTimeout(t);
  }, [rawSlug, enabled]);

  return lookup;
}

type PublicFirm = { name: string; logoVersion?: number | null; brandColor?: string | null };

/** Logo y color de la firma recordada: se piden aparte y, si fallan, queda el monograma. */
function useFirmBranding(slug: string) {
  const [branding, setBranding] = useState<{ logoVersion: number | null; brandColor: string | null }>({
    logoVersion: null,
    brandColor: null,
  });
  useEffect(() => {
    let alive = true;
    nestPublicFetch<PublicFirm>(`/tenants/public/${encodeURIComponent(slug)}`)
      .then((f) => alive && setBranding({ logoVersion: f.logoVersion ?? null, brandColor: f.brandColor ?? null }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [slug]);
  return branding;
}

/** Firma recordada en este navegador: se muestra su nombre (con su logo) y se puede cambiar. */
export function FirmChip({ name, slug, onChange }: { name: string; slug: string; onChange: () => void }) {
  const branding = useFirmBranding(slug);
  return (
    <div>
      <p className="label mb-1.5">Firma</p>
      <div className="flex items-center gap-3 rounded-[0.625rem] border border-slate-900/[0.16] bg-surface px-3 py-2.5 shadow-[0_1px_1px_rgb(23_21_17/0.04)]">
        <FirmMark name={name} slug={slug} logoVersion={branding.logoVersion} brandColor={branding.brandColor} size={32} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.9375rem] font-medium text-slate-900">{name}</span>
          <span className="block truncate font-mono text-xs text-slate-500">{slug}</span>
        </span>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded-md px-2 py-1 text-[13px] font-medium text-brand-700 hover:bg-brand-600/10"
          aria-label={`Cambiar de firma (ahora ${name})`}
        >
          Cambiar
        </button>
      </div>
    </div>
  );
}

/** Código de firma con comprobación en vivo. */
export const FirmCodeField = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (v: string) => void;
    onBlur?: () => void;
    lookup: FirmLookup;
    error?: string | null;
    autoFocus?: boolean;
  }
>(function FirmCodeField({ value, onChange, onBlur, lookup, error, autoFocus }, ref) {
  const status =
    lookup.state === "checking" ? (
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <Spinner className="h-3 w-3" /> Buscando la firma…
      </span>
    ) : lookup.state === "found" ? (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {lookup.name}
      </span>
    ) : (
      "Está en el correo de invitación de tu firma."
    );

  return (
    <AuthField
      ref={ref}
      id="tenantSlug"
      label="Código de firma"
      type="text"
      required
      autoFocus={autoFocus}
      autoComplete="organization"
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(applyFilter(e.target, filters.firmSlug))}
      onBlur={onBlur}
      maxLength={60}
      placeholder="codigo-de-tu-firma"
      error={error ?? (lookup.state === "missing" ? "No encontramos ninguna firma con ese código." : null)}
      hint={<span aria-live="polite">{status}</span>}
    />
  );
});
