"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { nestPublicFetch, NestApiError } from "@/lib/nest-api";
import { normalizeFirmSlug } from "@/lib/firm-memory";
import { Spinner } from "../ui";
import { AuthField } from "./AuthField";

export type FirmLookup =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "found"; name: string }
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
      nestPublicFetch<{ name: string }>(`/tenants/public/${encodeURIComponent(slug)}`)
        .then((firm) => id === seq.current && setLookup({ state: "found", name: firm.name }))
        .catch((err) => {
          if (id !== seq.current) return;
          setLookup(err instanceof NestApiError && err.status === 404 ? { state: "missing" } : { state: "error" });
        });
    }, 350);
    return () => clearTimeout(t);
  }, [rawSlug, enabled]);

  return lookup;
}

/** Firma recordada en este navegador: se muestra su nombre y se puede cambiar. */
export function FirmChip({ name, slug, onChange }: { name: string; slug: string; onChange: () => void }) {
  return (
    <div>
      <p className="label mb-1.5">Firma</p>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.09] bg-slate-900/[0.03] px-4 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Building2 className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[0.9375rem] font-medium text-slate-900">{name}</span>
          <span className="block truncate font-mono text-xs text-slate-500">{slug}</span>
        </span>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-brand-700 hover:bg-brand-600/10"
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
  { value: string; onChange: (v: string) => void; lookup: FirmLookup; error?: string | null; autoFocus?: boolean }
>(function FirmCodeField({ value, onChange, lookup, error, autoFocus }, ref) {
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
      icon={Building2}
      type="text"
      required
      autoFocus={autoFocus}
      autoComplete="organization"
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="p. ej. estudio-mejia"
      error={error ?? (lookup.state === "missing" ? "No encontramos ninguna firma con ese código." : null)}
      hint={<span aria-live="polite">{status}</span>}
    />
  );
});
