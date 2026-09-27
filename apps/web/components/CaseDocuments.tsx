"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { nestFetch, nestDownloadBlob } from "@/lib/nest-api";

type Doc = {
  id: string;
  fileName: string;
  sizeBytes: number;
  sharedWithClient: boolean;
  createdAt: string;
  uploadedBy: { name: string };
};

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
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (canMarkInternal) fd.set("sharedWithClient", shared ? "true" : "false");
    setLoading(true);
    try {
      const document = await nestFetch<Doc>(`/cases/${caseId}/documents`, {
        method: "POST",
        formData: fd,
        body: fd,
      });
      setDocs((d) => [document, ...d]);
      form.reset();
      router.refresh();
    } catch {
      const res = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setDocs((d) => [data.document, ...d]);
        form.reset();
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b px-4 py-3 text-sm font-semibold text-slate-800">Documentos</div>
      <ul className="divide-y">
        {docs.length === 0 && (
          <li className="px-4 py-6 text-sm text-slate-400">Sin documentos</li>
        )}
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <button
                type="button"
                onClick={() => nestDownloadBlob(d.id, d.fileName).catch(() => {
                  window.location.href = `/api/documents/${d.id}`;
                })}
                className="font-medium text-brand-700 hover:underline"
              >
                {d.fileName}
              </button>
              <div className="text-xs text-slate-400">
                {d.uploadedBy.name} · {(d.sizeBytes / 1024).toFixed(1)} KB
                {canMarkInternal && (
                  <span className="ml-2">
                    {d.sharedWithClient ? "· Compartido" : "· Interno"}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={onUpload} className="space-y-2 border-t p-3">
        <input name="file" type="file" required className="block w-full text-sm" />
        {canMarkInternal && (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
            />
            Compartir con el cliente
          </label>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Subiendo…" : "Subir archivo"}
        </button>
      </form>
    </div>
  );
}
