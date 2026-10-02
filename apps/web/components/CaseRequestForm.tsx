"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "./ui";

const MATTERS = ["Laboral", "Civil", "Familia", "Penal", "Mercantil", "Tributario", "Administrativo", "Otro"];

/** El cliente describe su caso; el despacho lo acepta, aplaza o rechaza. */
export function CaseRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const created = await nestFetch<{ id: string }>("/portal/case-requests", {
        method: "POST",
        body: JSON.stringify({
          title: String(fd.get("title")).trim(),
          matterType: String(fd.get("matterType") ?? "") || undefined,
          description: String(fd.get("description")).trim(),
        }),
      });
      router.push(`/portal/casos/${created.id}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo enviar la solicitud."));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5 sm:p-6">
      <div>
        <label htmlFor="title" className="label">Título *</label>
        <input
          id="title"
          name="title"
          required
          minLength={2}
          maxLength={200}
          className="input mt-1"
          placeholder="Ej. Despido sin liquidación"
        />
      </div>
      <div>
        <label htmlFor="matterType" className="label">Materia</label>
        <select id="matterType" name="matterType" defaultValue="" className="input mt-1">
          <option value="">No lo sé</option>
          {MATTERS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="description" className="label">¿Qué ocurrió? *</label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={5000}
          rows={7}
          className="input mt-1"
          placeholder="Cuéntanos los hechos, las fechas importantes y qué necesitas. Podrás enviar documentos cuando aceptemos el caso."
        />
      </div>
      {error && <FormMessage type="error">{error}</FormMessage>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Te responderemos por email.</p>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Spinner />}
          {loading ? "Enviando…" : "Enviar solicitud"}
        </button>
      </div>
    </form>
  );
}
