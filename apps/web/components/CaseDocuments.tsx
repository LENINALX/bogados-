"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { NestApiError, nestFetch, nestDownloadBlob } from "@/lib/nest-api";
import { LIMITS, checkUpload } from "@/lib/validation";
import { Download, Eye, FileText, Lock, Paperclip, Upload } from "lucide-react";
import { EmptyState, FormMessage, Spinner, errorMessage } from "./ui";
import { Badge } from "./staff/primitives";
import { FieldError, fieldA11y } from "./form/FieldError";

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
  const [fileError, setFileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    const invalid = checkUpload(file instanceof File ? file : null);
    if (invalid) {
      setFileError(invalid);
      document.getElementById(fileInputId)?.focus();
      return;
    }
    setFileError(null);
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
      // 413: el servidor cortó la subida por tamaño; 400 de tipo: el filtro de la API
      const text =
        err instanceof NestApiError && err.status === 413
          ? `El archivo supera el máximo de ${LIMITS.upload.maxBytes / 1024 / 1024} MB.`
          : errorMessage(err, "No se pudo subir el documento. Inténtalo de nuevo.");
      if (/tipo de archivo|demasiado grande|supera el máximo/i.test(text)) setFileError(text);
      else setMessage({ type: "error", text });
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

  const fileInputId = `doc-file-${caseId}`;

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-slate-500" aria-hidden />
          Documentos
        </h2>
        <span className="text-xs tabular-nums text-slate-500">{docs.length}</span>
      </div>
      {docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aún no hay documentos"
          hint={canMarkInternal ? "Sube el primero abajo y decide si lo ve el cliente." : "Cuando tu abogado comparta un documento, aparecerá aquí."}
        />
      ) : (
        <ul className="divide-y divide-slate-900/[0.06]">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex min-h-[52px] items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-slate-900/[0.02] sm:px-5"
            >
              <span
                className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-900/[0.08] bg-slate-50 text-slate-500"
                aria-hidden
              >
                {downloading === d.id ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    <span className="mt-px text-[8px] font-semibold uppercase leading-none tracking-wide">
                      {extension(d.fileName)}
                    </span>
                  </>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onDownload(d)}
                  disabled={downloading === d.id}
                  className="group inline-flex max-w-full items-center gap-1.5 text-left font-medium text-slate-900 underline-offset-2 hover:text-brand-700 hover:underline disabled:opacity-60"
                  title={`Descargar ${d.fileName}`}
                >
                  <span className="truncate">{d.fileName}</span>
                  <Download
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                </button>
                <div className="mt-0.5 text-xs tabular-nums text-slate-500">
                  {d.uploadedBy.name} · {formatSize(d.sizeBytes)} · {new Date(d.createdAt).toLocaleDateString("es-EC")}
                </div>
              </div>
              {canMarkInternal && (
                <Badge tone={d.sharedWithClient ? "emerald" : "amber"} icon={d.sharedWithClient ? Eye : Lock}>
                  {d.sharedWithClient ? "Compartido" : "Interno"}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onUpload} noValidate className="space-y-3 border-t border-slate-900/[0.06] px-4 py-4 sm:px-5">
        <div>
          <label
            htmlFor={fileInputId}
            className={`group flex cursor-pointer items-center gap-3 rounded-[10px] border border-dashed px-3 py-3 ${
              fileError ? "border-red-300" : "border-slate-900/[0.18]"
            } text-sm text-slate-600 transition-colors duration-150 hover:border-brand-500 hover:bg-slate-900/[0.02] focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-600/15`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700" aria-hidden>
              <Upload className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate ${fileName ? "font-medium text-slate-900" : "text-slate-700"}`}>
                {fileName ?? "Elige un archivo"}
              </span>
              <span id={`${fileInputId}-hint`} className="block text-xs text-slate-500">
                PDF, Word, Excel, imagen o texto · hasta {LIMITS.upload.maxBytes / 1024 / 1024} MB
              </span>
            </span>
            <input
              id={fileInputId}
              name="file"
              type="file"
              required
              accept={LIMITS.upload.extensions.join(",")}
              {...fieldA11y(fileInputId, fileError, `${fileInputId}-hint`)}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                // Se comprueba al elegirlo: no hace falta esperar a subirlo para saber que no vale
                const invalid = file ? checkUpload(file) : null;
                setFileError(invalid && file ? `«${file.name}»: ${invalid}` : null);
                if (invalid) e.target.value = "";
                setFileName(invalid ? null : (file?.name ?? null));
                if (message?.type === "error") setMessage(null);
              }}
            />
          </label>
          <FieldError id={fileInputId} error={fileError} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {canMarkInternal ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
              />
              Compartir con el cliente
            </label>
          ) : (
            <span className="text-xs text-slate-500">El archivo se compartirá con tu abogado.</span>
          )}
          <button type="submit" disabled={loading} className="btn-primary btn-sm">
            {loading && <Spinner className="h-3 w-3" />}
            {loading ? "Subiendo…" : "Subir archivo"}
          </button>
        </div>
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </form>
    </section>
  );
}

/** Extensión corta para el icono del archivo ("pdf", "docx"…). */
function extension(name: string) {
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  return ext.slice(0, 4);
}
