"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch, nestDownloadBlob } from "@/lib/nest-api";
import { EmptyState, FormMessage, Spinner, errorMessage } from "./ui";

type Doc = {
  id: string;
  fileName: string;
  sizeBytes: number;
  sharedWithClient: boolean;
  createdAt: string;
  uploadedBy: { name: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CaseDocuments({
  caseId,
  initial,
  canMarkInternal,
}: {
  caseId: string;
  initial: Doc[];
  canMarkInternal: boolean;
}) {
  const [docs, setDocs] = useState(initial);
  const [shared, setShared] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (canMarkInternal) fd.set("sharedWithClient", shared ? "true" : "false");
    setLoading(true);
    setMessage(null);
    try {
      const document = await nestFetch<Doc>(`/cases/${caseId}/documents`, {
        method: "POST",
        formData: fd,
        body: fd,
      });
      setDocs((d) => [document, ...d]);
      form.reset();
      setFileName(null);
      setMessage({ type: "success", text: `"${document.fileName}" se subió correctamente.` });
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: errorMessage(err, "No se pudo subir el documento. Inténtalo de nuevo."),
      });
    } finally {
      setLoading(false);
    }
  }

  async function onDownload(d: Doc) {
    setDownloading(d.id);
    setMessage(null);
    try {
      await nestDownloadBlob(d.id, d.fileName);
    } catch {
      setMessage({ type: "error", text: `No se pudo descargar "${d.fileName}".` });
    } finally {
      setDownloading(null);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">Documentos</h2>
        <span className="text-xs text-slate-400">{docs.length}</span>
      </div>
      {docs.length === 0 ? (
        <EmptyState
          title="Aún no hay documentos"
          hint={canMarkInternal ? "Sube el primero con el formulario de abajo." : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onDownload(d)}
                  disabled={downloading === d.id}
                  className="inline-flex max-w-full items-center gap-2 truncate text-left font-medium text-brand-700 hover:underline disabled:opacity-60"
                  title={`Descargar ${d.fileName}`}
                >
                  {downloading === d.id && <Spinner className="h-3 w-3" />}
                  <span className="truncate">{d.fileName}</span>
                </button>
                <div className="mt-0.5 text-xs text-slate-500">
                  {d.uploadedBy.name} · {formatSize(d.sizeBytes)} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString("es-EC")}
                </div>
              </div>
              {canMarkInternal && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    d.sharedWithClient ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {d.sharedWithClient ? "Compartido" : "Interno"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onUpload} className="space-y-3 border-t border-slate-100 px-4 py-4 sm:px-5">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600 transition hover:border-brand-500 hover:bg-slate-50 focus-within:border-brand-500">
          <span className="btn-secondary btn-sm pointer-events-none">Elegir archivo</span>
          <span className="truncate">{fileName ?? "Ningún archivo seleccionado"}</span>
          <input
            name="file"
            type="file"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canMarkInternal ? (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              Compartir con el cliente
            </label>
          ) : (
            <span />
          )}
          <button type="submit" disabled={loading || !fileName} className="btn-primary btn-sm">
            {loading && <Spinner className="h-3 w-3" />}
            {loading ? "Subiendo…" : "Subir archivo"}
          </button>
        </div>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </form>
    </section>
  );
}
