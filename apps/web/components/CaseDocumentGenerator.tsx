"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FilePlus2 } from "lucide-react";
import { NestApiError, nestDownloadBlob, nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner } from "./ui";

type GeneratedDocument = { id: string; fileName: string };

const templates = [
  ["demanda", "Demanda"],
  ["contestacion", "Contestación"],
  ["impulso", "Escrito de impulso"],
  ["poder", "Poder"],
] as const;

export function CaseDocumentGenerator({ caseId }: { caseId: string }) {
  const [template, setTemplate] = useState<(typeof templates)[number][0]>("demanda");
  const [format, setFormat] = useState<"docx" | "pdf">("docx");
  const [court, setCourt] = useState("");
  const [opposingParty, setOpposingParty] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const document = await nestFetch<GeneratedDocument>(`/cases/${caseId}/documents/generate`, {
        method: "POST",
        body: JSON.stringify({ template, format, court, opposingParty }),
      });
      await nestDownloadBlob(document.id, document.fileName);
      router.refresh();
      setMessage({ type: "success", text: `Se generó y guardó ${document.fileName}.` });
    } catch (error) {
      const text = error instanceof NestApiError ? error.message : "No se pudo generar el escrito.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <FilePlus2 className="h-4 w-4 text-slate-500" aria-hidden />
          Generar escrito
        </h2>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          Plantilla
          <select className="input" value={template} onChange={(event) => setTemplate(event.target.value as typeof template)}>
            {templates.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">
          Formato
          <select className="input" value={format} onChange={(event) => setFormat(event.target.value as typeof format)}>
            <option value="docx">Word (.docx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Juzgado
          <input
            className="input"
            required
            maxLength={200}
            value={court}
            onChange={(event) => setCourt(event.target.value)}
            placeholder="Unidad Judicial competente"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
          Contraparte <span className="font-normal">(opcional)</span>
          <input
            className="input"
            maxLength={200}
            value={opposingParty}
            onChange={(event) => setOpposingParty(event.target.value)}
            placeholder="Nombre o razón social"
          />
        </label>
        <p className="text-xs leading-relaxed text-slate-500 sm:col-span-2">
          Cliente, proceso, materia y abogado se completan con los datos del caso. El borrador se guarda como documento interno.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar y guardar en el caso
          </span>
          <button type="submit" className="btn-primary btn-sm" disabled={loading || !court.trim()}>
            {loading ? <Spinner className="h-3.5 w-3.5" /> : <FilePlus2 className="h-3.5 w-3.5" aria-hidden />}
            {loading ? "Generando…" : "Generar escrito"}
          </button>
        </div>
        {message && <div className="sm:col-span-2"><FormMessage type={message.type}>{message.text}</FormMessage></div>}
      </form>
    </section>
  );
}