"use client";

import { FormEvent, useEffect, useState } from "react";
import { nestFetch } from "@/lib/nest-api";
import { SlotPicker } from "./SlotPicker";
import { FormMessage, Spinner, errorMessage } from "./ui";
import { useToast } from "./Toaster";

type Option = { id: string; name: string };

/** El cliente pide una cita: abogado → hueco libre → motivo. Queda pendiente de confirmar. */
export function BookAppointmentForm({
  cases,
  onBooked,
}: {
  cases: { id: string; title: string }[];
  onBooked: () => void;
}) {
  const [lawyers, setLawyers] = useState<Option[] | null>(null);
  const [lawyerId, setLawyerId] = useState("");
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toast = useToast();

  useEffect(() => {
    nestFetch<Option[]>("/appointments/lawyers")
      .then((list) => {
        setLawyers(list);
        if (list.length === 1) setLawyerId(list[0].id);
      })
      .catch((err) => setMessage({ type: "error", text: errorMessage(err, "No se pudieron cargar los abogados.") }));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!startsAt) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    setLoading(true);
    setMessage(null);
    try {
      await nestFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          lawyerId,
          startsAt,
          reason: String(fd.get("reason") ?? "").trim() || undefined,
          caseId: String(fd.get("caseId") ?? "") || undefined,
        }),
      });
      form.reset();
      setStartsAt(null);
      setReloadKey((k) => k + 1);
      toast("success", "Cita solicitada · te avisaremos cuando la confirmen");
      onBooked();
    } catch (err) {
      // 409: alguien reservó ese hueco a la vez → recargar los horarios
      setReloadKey((k) => k + 1);
      setMessage({ type: "error", text: errorMessage(err, "No se pudo pedir la cita.") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">Pedir una cita</h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 px-4 py-4 sm:px-5">
        {lawyers && lawyers.length === 0 ? (
          <p className="text-sm text-slate-500">Por ahora no hay horarios de atención publicados.</p>
        ) : (
          <>
            <div>
              <label htmlFor="lawyerId" className="label">Abogado</label>
              <select
                id="lawyerId"
                required
                value={lawyerId}
                onChange={(e) => setLawyerId(e.target.value)}
                className="input mt-1"
              >
                <option value="" disabled>Elige…</option>
                {lawyers?.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {lawyerId && (
              <div>
                <span className="label mb-1">Día y hora</span>
                <SlotPicker lawyerId={lawyerId} value={startsAt} onChange={setStartsAt} reloadKey={reloadKey} />
              </div>
            )}

            {cases.length > 0 && (
              <div>
                <label htmlFor="caseId" className="label">Caso (opcional)</label>
                <select id="caseId" name="caseId" defaultValue="" className="input mt-1">
                  <option value="">Consulta general</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="reason" className="label">Motivo (opcional)</label>
              <textarea id="reason" name="reason" rows={2} maxLength={500} className="input mt-1" />
            </div>

            <button type="submit" disabled={!startsAt || loading} className="btn-primary w-full">
              {loading && <Spinner />}
              {loading ? "Enviando…" : "Pedir cita"}
            </button>
          </>
        )}
        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </form>
    </section>
  );
}
