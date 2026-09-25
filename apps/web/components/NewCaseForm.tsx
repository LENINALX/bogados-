"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CASE_STATUSES, CASE_STATUS_LABELS } from "@bogados/shared";
import { nestFetch } from "@/lib/nest-api";

type Option = { id: string; name: string; email?: string };
type ClientMode = "none" | "existing" | "new";

const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const label = "block text-sm font-medium text-slate-700";

export function NewCaseForm({
  lawyers,
  clients,
  canPickLawyer,
  currentUserId,
}: {
  lawyers: Option[];
  clients: Option[];
  canPickLawyer: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [clientMode, setClientMode] = useState<ClientMode>(clients.length ? "existing" : "none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => String(fd.get(k) ?? "").trim();
    setLoading(true);
    setError(null);

    try {
      let clientId: string | undefined;
      if (clientMode === "existing") clientId = str("clientId") || undefined;
      if (clientMode === "new") {
        const created = await nestFetch<{ id: string }>("/auth/register-client", {
          method: "POST",
          body: JSON.stringify({
            name: str("clientName"),
            email: str("clientEmail"),
            password: str("clientPassword"),
          }),
        });
        clientId = created.id;
      }

      const created = await nestFetch<{ id: string }>("/cases", {
        method: "POST",
        body: JSON.stringify({
          title: str("title"),
          matterType: str("matterType") || undefined,
          description: str("description") || undefined,
          status: str("status") || undefined,
          lawyerId: canPickLawyer ? str("lawyerId") || undefined : undefined,
          clientId,
        }),
      });
      router.push(`/casos/${created.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el caso.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">Datos del caso</h2>
        <div>
          <label className={label} htmlFor="title">Título *</label>
          <input id="title" name="title" required minLength={2} maxLength={200} className={input} placeholder="Ej. Demanda laboral — Pérez vs. ACME" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="matterType">Materia</label>
            <input id="matterType" name="matterType" maxLength={100} className={input} placeholder="Laboral, Civil, Penal…" />
          </div>
          <div>
            <label className={label} htmlFor="status">Estado inicial</label>
            <select id="status" name="status" defaultValue="intake" className={input}>
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="description">Descripción</label>
          <textarea id="description" name="description" rows={4} maxLength={5000} className={input} />
        </div>
        {canPickLawyer && (
          <div>
            <label className={label} htmlFor="lawyerId">Abogado responsable</label>
            <select id="lawyerId" name="lawyerId" defaultValue={currentUserId} className={input}>
              {lawyers.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">Cliente</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["existing", "Cliente existente"],
              ["new", "Invitar cliente nuevo"],
              ["none", "Sin cliente por ahora"],
            ] as [ClientMode, string][]
          ).map(([mode, text]) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                name="clientMode"
                checked={clientMode === mode}
                onChange={() => setClientMode(mode)}
                disabled={mode === "existing" && clients.length === 0}
              />
              {text}
            </label>
          ))}
        </div>

        {clientMode === "existing" && (
          <select name="clientId" required className={input} aria-label="Cliente">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.email}
              </option>
            ))}
          </select>
        )}

        {clientMode === "new" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="clientName">Nombre *</label>
              <input id="clientName" name="clientName" required minLength={2} maxLength={120} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="clientEmail">Email *</label>
              <input id="clientEmail" name="clientEmail" type="email" required className={input} />
            </div>
            <div>
              <label className={label} htmlFor="clientPassword">Contraseña temporal *</label>
              <input id="clientPassword" name="clientPassword" type="text" required minLength={6} className={input} autoComplete="off" />
            </div>
            <p className="text-xs text-slate-500 sm:col-span-3">
              Comparte la contraseña temporal con el cliente para que acceda al portal.
            </p>
          </div>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-60"
        >
          {loading ? "Creando…" : "Crear caso"}
        </button>
      </div>
    </form>
  );
}
