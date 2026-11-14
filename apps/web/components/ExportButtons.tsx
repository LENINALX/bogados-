"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { nestDownloadFile } from "@/lib/nest-api";
import { exportFileName, exportPath, type ExportFormat, type ExportResource } from "@/lib/exports";
import { Spinner, errorMessage } from "@/components/ui";
import { useToast } from "@/components/Toaster";

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: "xlsx", label: "Excel" },
  { format: "pdf", label: "PDF" },
];

/**
 * Exportar a Excel o PDF lo que se está viendo. El archivo lo genera la API, que aplica los
 * permisos del rol: aquí solo se le pasan los filtros de la vista.
 */
export function ExportButtons({
  resource,
  label,
  filters,
}: {
  resource: ExportResource;
  /** Para lectores de pantalla: «Exportar casos» */
  label: string;
  filters?: Record<string, string | undefined>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function download(format: ExportFormat) {
    setBusy(format);
    try {
      await nestDownloadFile(exportPath(resource, format, filters), exportFileName(resource, format));
    } catch (err) {
      toast("error", errorMessage(err, "No se pudo generar el archivo. Inténtalo de nuevo."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
        <Download className="h-3.5 w-3.5" aria-hidden />
        Exportar
      </span>
      {FORMATS.map(({ format, label: name }) => (
        <button
          key={format}
          type="button"
          onClick={() => download(format)}
          disabled={busy !== null}
          aria-label={`${label} a ${name}`}
          className="btn-secondary btn-sm"
        >
          {busy === format && <Spinner className="h-3.5 w-3.5" />}
          {name}
        </button>
      ))}
    </div>
  );
}
