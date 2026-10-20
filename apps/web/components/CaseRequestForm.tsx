"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { LIMITS, Schema, clean, rules } from "@/lib/validation";
import { FormMessage, Spinner, errorMessage } from "./ui";
import { CharCount, FieldError, INVALID_INPUT, countId, fieldA11y } from "./form/FieldError";
import { useFieldErrors } from "./form/useFieldErrors";

type Field = "title" | "description";

const SCHEMA: Schema<Field> = {
  title: [
    rules.required("Escribe un título que resuma tu situación."),
    rules.minLength(LIMITS.caseTitle.min, `El título debe tener al menos ${LIMITS.caseTitle.min} caracteres.`),
    rules.maxLength(LIMITS.caseTitle.max),
  ],
  description: [
    rules.required("Cuéntanos qué ocurrió."),
    rules.minLength(
      LIMITS.requestDescription.min,
      `Cuéntanos un poco más: al menos ${LIMITS.requestDescription.min} caracteres.`,
    ),
    rules.maxLength(LIMITS.requestDescription.max),
  ],
};

const MATTERS = ["Laboral", "Civil", "Familia", "Penal", "Mercantil", "Tributario", "Administrativo", "Otro"];

/** El cliente describe su caso; el despacho lo acepta, aplaza o rechaza. */
export function CaseRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const v = useFieldErrors<Field>(SCHEMA, ["title", "description"]);
  const { errors } = v;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData(e.currentTarget);
    const values = { title: clean(String(fd.get("title") ?? "")), description: clean(description) };
    setError(null);
    if (!v.submit(values)) return;
    setLoading(true);
    try {
      const created = await nestFetch<{ id: string }>("/portal/case-requests", {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          matterType: String(fd.get("matterType") ?? "") || undefined,
          description: values.description,
        }),
      });
      router.push(`/portal/casos/${created.id}`);
      router.refresh();
    } catch (err) {
      const text = errorMessage(err, "No se pudo enviar la solicitud.");
      setLoading(false);
      if (/cuéntanos un poco más/i.test(text)) v.set("description", text);
      else setError(text);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-5 p-5 sm:p-6" aria-label="Solicitud de caso">
      <div>
        <label htmlFor="title" className="label">Título</label>
        <input
          id="title"
          name="title"
          required
          maxLength={LIMITS.caseTitle.max}
          onBlur={(e) => v.blur("title", clean(e.target.value))}
          onChange={(e) => v.change("title", clean(e.target.value))}
          {...fieldA11y("title", errors.title, !errors.title && "title-hint")}
          className={`input mt-1.5 ${errors.title ? INVALID_INPUT : ""}`}
          placeholder="Ej. Despido sin liquidación"
        />
        <FieldError id="title" error={errors.title} />
        {!errors.title && <p id="title-hint" className="mt-1.5 text-xs text-slate-500">Una frase que resuma tu situación.</p>}
      </div>
      <div>
        <label htmlFor="matterType" className="label">
          Materia <span className="font-normal text-slate-500">(opcional)</span>
        </label>
        <select id="matterType" name="matterType" defaultValue="" className="input mt-1.5">
          <option value="">No lo sé</option>
          {MATTERS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="description" className="label">¿Qué ocurrió?</label>
        <textarea
          id="description"
          name="description"
          required
          maxLength={LIMITS.requestDescription.max}
          rows={7}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            v.change("description", clean(e.target.value));
          }}
          onBlur={(e) => e.target.value && v.blur("description", clean(e.target.value))}
          {...fieldA11y(
            "description",
            errors.description,
            countId("description", description.length, LIMITS.requestDescription.max),
            "description-hint",
          )}
          className={`input mt-1.5 leading-relaxed ${errors.description ? INVALID_INPUT : ""}`}
          placeholder="Cuéntanos los hechos, las fechas importantes y qué necesitas."
        />
        <FieldError id="description" error={errors.description} />
        <CharCount
          id="description"
          length={description.length}
          max={LIMITS.requestDescription.max}
          className="mt-1 text-right"
        />
        <p id="description-hint" className="mt-1.5 text-xs leading-relaxed text-slate-500">
          No hace falta que uses términos legales. Podrás enviar documentos cuando aceptemos el caso.
        </p>
      </div>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/[0.06] pt-5">
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Mail className="h-3.5 w-3.5" aria-hidden />
          Te responderemos por email.
        </p>
        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? <Spinner /> : <Send className="h-4 w-4" aria-hidden />}
          {loading ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}
