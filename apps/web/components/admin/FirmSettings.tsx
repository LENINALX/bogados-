"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Mail, Trash2 } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { LIMITS, clean, rules, type Schema } from "@/lib/validation";
import {
  BOGADOS_BRAND,
  BRAND_PRESETS,
  HEX_COLOR,
  brandColorProblem,
  contrastWithWhite,
  logoFileProblem,
  normalizeWebsite,
  phoneProblem,
  websiteProblem,
} from "@/lib/firm-branding";
import { FirmMark } from "@/components/FirmMark";
import { FieldError, INVALID_INPUT, fieldA11y } from "@/components/form/FieldError";
import { useFieldErrors } from "@/components/form/useFieldErrors";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";

export type FirmSettingsValues = {
  id: string;
  slug: string;
  name: string;
  brandColor: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  logoVersion: number | null;
};

type Field = "name" | "brandColor" | "contactEmail" | "contactPhone" | "address" | "website";
const ORDER: readonly Field[] = ["name", "brandColor", "contactEmail", "contactPhone", "address", "website"];
const ADDRESS_MAX = 200;

const schema: Schema<Field> = {
  name: [
    rules.required("Escribe el nombre de la firma."),
    rules.minLength(LIMITS.firmName.min, `El nombre lleva al menos ${LIMITS.firmName.min} caracteres.`),
    rules.maxLength(LIMITS.firmName.max),
  ],
  brandColor: [brandColorProblem],
  contactEmail: [rules.email()],
  contactPhone: [phoneProblem, rules.maxLength(25)],
  address: [rules.maxLength(ADDRESS_MAX)],
  website: [(v) => websiteProblem(normalizeWebsite(v)), rules.maxLength(200)],
};

const idOf = (f: Field) => `firm-${f}`;

/**
 * Admin › Ajustes: nombre, logo, color de marca y contacto de la firma. Se ven en los emails
 * (que además responden al email de contacto), en la pantalla de acceso y en el portal.
 */
export function FirmSettings({ initial }: { initial: FirmSettingsValues }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    name: initial.name,
    brandColor: initial.brandColor ?? "",
    contactEmail: initial.contactEmail ?? "",
    contactPhone: initial.contactPhone ?? "",
    address: initial.address ?? "",
    website: initial.website ?? "",
  });
  const [saved, setSaved] = useState(values);
  const [logoVersion, setLogoVersion] = useState(initial.logoVersion);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldErrors = useFieldErrors(schema, ORDER, idOf);
  const { errors } = fieldErrors;

  const dirty = ORDER.some((f) => values[f] !== saved[f]);
  const color = HEX_COLOR.test(values.brandColor) && !brandColorProblem(values.brandColor) ? values.brandColor : BOGADOS_BRAND;

  function set(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    fieldErrors.change(field, value);
    setMessage(null);
  }

  const bind = (field: Field) => ({
    id: idOf(field),
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(field, e.target.value),
    onBlur: () => fieldErrors.blur(field, values[field]),
    ...fieldA11y(idOf(field), errors[field], `${idOf(field)}-hint`),
    className: `input ${errors[field] ? INVALID_INPUT : ""}`,
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = { ...values, website: normalizeWebsite(values.website), brandColor: values.brandColor.trim().toLowerCase() };
    setValues(next);
    if (!fieldErrors.submit(next)) return;
    const body: Record<string, string | null> = {};
    for (const f of ORDER) {
      if (next[f] === saved[f]) continue;
      body[f] = f === "name" ? clean(next[f]) : clean(next[f]) || null;
    }
    if (!Object.keys(body).length) return;
    setSaving(true);
    setMessage(null);
    try {
      await nestFetch(`/tenants/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) });
      setSaved(next);
      setMessage({ type: "success", text: "Ajustes guardados. Los próximos emails ya salen con estos datos." });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "No se pudieron guardar los ajustes.") });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const problem = logoFileProblem(file);
    setLogoError(problem);
    if (problem) return;
    const fd = new FormData();
    fd.append("file", file);
    setLogoBusy(true);
    try {
      const res = await nestFetch<{ logoUpdatedAt: string }>(`/tenants/${initial.id}/logo`, { method: "POST", body: fd });
      setLogoVersion(new Date(res.logoUpdatedAt).getTime());
      router.refresh();
    } catch (err) {
      setLogoError(errorMessage(err, "No se pudo subir el logo."));
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError(null);
    try {
      await nestFetch(`/tenants/${initial.id}/logo`, { method: "DELETE" });
      setLogoVersion(null);
      router.refresh();
    } catch (err) {
      setLogoError(errorMessage(err, "No se pudo quitar el logo."));
    } finally {
      setLogoBusy(false);
    }
  }

  const contact = [values.contactEmail, values.contactPhone, values.address, normalizeWebsite(values.website)]
    .map((v) => v.trim())
    .filter(Boolean);
  const ratio = HEX_COLOR.test(values.brandColor) ? contrastWithWhite(values.brandColor) : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
      <form onSubmit={save} noValidate className="space-y-6">
        {/* ── Identidad ── */}
        <section className="card" aria-labelledby="firm-identity">
          <div className="card-header">
            <h2 id="firm-identity" className="card-title">
              Identidad
            </h2>
          </div>
          <div className="card-body space-y-5">
            <div>
              <label htmlFor={idOf("name")} className="label">
                Nombre de la firma
              </label>
              <input {...bind("name")} maxLength={LIMITS.firmName.max} autoComplete="organization" />
              <p id={`${idOf("name")}-hint`} className="mt-1.5 text-xs text-slate-500">
                Código de acceso: <span className="font-mono">{initial.slug}</span> (no cambia).
              </p>
              <FieldError id={idOf("name")} error={errors.name} />
            </div>

            <div>
              <p className="label" id="logo-label">
                Logo
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <FirmMark
                  name={values.name || initial.name}
                  slug={initial.slug}
                  logoVersion={logoVersion}
                  brandColor={color}
                  size={56}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    id="firm-logo"
                    aria-labelledby="logo-label"
                    aria-describedby="firm-logo-hint"
                    onChange={(e) => uploadLogo(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={logoBusy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {logoBusy ? <Spinner className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />}
                    {logoVersion ? "Cambiar logo" : "Subir logo"}
                  </button>
                  {logoVersion && (
                    <button type="button" className="btn-ghost btn-sm text-red-700" disabled={logoBusy} onClick={removeLogo}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              <p id="firm-logo-hint" className="mt-1.5 text-xs text-slate-500">
                PNG, JPG o WebP de hasta 512 KB. Mejor con fondo transparente o blanco; se muestra a 40 px de alto.
              </p>
              {logoError && (
                <p role="alert" className="mt-1.5 text-xs text-red-700">
                  {logoError}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="label">Color de marca</legend>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Colores sugeridos">
                {BRAND_PRESETS.map((p) => {
                  const active = (values.brandColor || BOGADOS_BRAND) === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      title={p.label}
                      aria-label={p.label}
                      aria-pressed={active}
                      onClick={() => set("brandColor", p.value === BOGADOS_BRAND ? "" : p.value)}
                      className="grid h-8 w-8 place-items-center rounded-full ring-offset-2 transition hover:scale-105 focus-visible:ring-2 aria-pressed:ring-2 aria-pressed:ring-slate-900"
                      style={{ backgroundColor: p.value }}
                    >
                      {active && <Check className="h-4 w-4 text-white" aria-hidden />}
                    </button>
                  );
                })}
                <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
                <input
                  type="color"
                  aria-label="Elegir otro color"
                  value={HEX_COLOR.test(values.brandColor) ? values.brandColor : BOGADOS_BRAND}
                  onChange={(e) => set("brandColor", e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded-md border border-slate-200 bg-surface p-0.5"
                />
                <input
                  {...bind("brandColor")}
                  placeholder={BOGADOS_BRAND}
                  maxLength={7}
                  spellCheck={false}
                  autoCapitalize="none"
                  className={`input w-28 font-mono ${errors.brandColor ? INVALID_INPUT : ""}`}
                />
              </div>
              <p id={`${idOf("brandColor")}-hint`} className="mt-1.5 text-xs text-slate-500">
                Botones y detalles de los emails y del acceso.{" "}
                {ratio && !brandColorProblem(values.brandColor)
                  ? `Contraste con texto blanco: ${ratio.toFixed(1)}:1, bien.`
                  : !values.brandColor
                    ? "Sin elegir, se usa el de Bogados."
                    : ""}
              </p>
              <FieldError id={idOf("brandColor")} error={errors.brandColor} />
            </fieldset>
          </div>
        </section>

        {/* ── Contacto ── */}
        <section className="card" aria-labelledby="firm-contact">
          <div className="card-header">
            <h2 id="firm-contact" className="card-title">
              Contacto
            </h2>
          </div>
          <div className="card-body grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={idOf("contactEmail")} className="label">
                Email de contacto
              </label>
              <input {...bind("contactEmail")} type="email" inputMode="email" autoComplete="email" placeholder="despacho@mifirma.ec" />
              <p id={`${idOf("contactEmail")}-hint`} className="mt-1.5 text-xs text-slate-500">
                Si un cliente responde a un email de la plataforma, la respuesta llega aquí.
              </p>
              <FieldError id={idOf("contactEmail")} error={errors.contactEmail} />
            </div>
            <div>
              <label htmlFor={idOf("contactPhone")} className="label">
                Teléfono
              </label>
              <input {...bind("contactPhone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="+593 2 123 4567" maxLength={25} />
              <span id={`${idOf("contactPhone")}-hint`} hidden />
              <FieldError id={idOf("contactPhone")} error={errors.contactPhone} />
            </div>
            <div>
              <label htmlFor={idOf("website")} className="label">
                Web
              </label>
              <input {...bind("website")} type="url" inputMode="url" autoComplete="url" placeholder="mifirma.ec" maxLength={200} />
              <span id={`${idOf("website")}-hint`} hidden />
              <FieldError id={idOf("website")} error={errors.website} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={idOf("address")} className="label">
                Dirección
              </label>
              <input {...bind("address")} autoComplete="street-address" placeholder="Av. Amazonas N24-03, Quito" maxLength={ADDRESS_MAX} />
              <p id={`${idOf("address")}-hint`} className="mt-1.5 text-xs text-slate-500">
                Todo lo de esta sección es opcional y sale al pie de los emails. Déjalo vacío para no mostrarlo.
              </p>
              <FieldError id={idOf("address")} error={errors.address} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving || !dirty}>
            {saving && <Spinner className="h-4 w-4" />}
            Guardar cambios
          </button>
          {dirty && !saving && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setValues(saved);
                fieldErrors.reset();
                setMessage(null);
              }}
            >
              Descartar
            </button>
          )}
          {!dirty && !message && <span className="text-sm text-slate-500">Sin cambios por guardar.</span>}
        </div>
        {message && (
          <div aria-live="polite">
            <FormMessage type={message.type}>{message.text}</FormMessage>
          </div>
        )}
      </form>

      {/* ── Vista previa de un email ── */}
      <aside aria-labelledby="firm-preview" className="xl:sticky xl:top-6">
        <h2 id="firm-preview" className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Mail className="h-4 w-4" aria-hidden /> Así lo verán tus clientes
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-[13px] text-slate-700 shadow-sm">
          <div className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            <p className="truncate">
              <span className="font-medium text-slate-700">{values.name || initial.name} vía Bogados</span>
            </p>
            <p className="truncate">Cita confirmada</p>
          </div>
          <div className="space-y-3 px-4 py-4">
            <FirmMark name={values.name || initial.name} slug={initial.slug} logoVersion={logoVersion} brandColor={color} size={36} />
            <p>Hola Nombre,</p>
            <p>
              El despacho ha confirmado tu cita del <strong>lunes 16 de noviembre, 10:00</strong>.
            </p>
            <span className="inline-block rounded-lg px-4 py-2 text-[13px] font-medium text-white" style={{ backgroundColor: color }}>
              Ver mis citas
            </span>
            {contact.length > 0 && (
              <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
                <strong className="text-slate-700">{values.name || initial.name}</strong>
                {contact.map((c) => (
                  <span key={c} className="block break-words">
                    {c}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
