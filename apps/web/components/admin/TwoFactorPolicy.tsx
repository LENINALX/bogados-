"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { FormMessage, Spinner, errorMessage } from "@/components/ui";

type Props = {
  tenantId: string;
  /** Política actual de la firma (Tenant.requireTwoFactor) */
  required: boolean;
  /** Admins y abogados activos */
  teamTotal: number;
  /** De ellos, cuántos la activaron por su cuenta */
  teamWithTwoFactor: number;
};

/**
 * Interruptor de la política «exigir verificación en dos pasos al equipo».
 * Cambiarlo pide confirmación en línea, porque afecta al próximo inicio de sesión de todos.
 */
export function TwoFactorPolicy({ tenantId, required, teamTotal, teamWithTwoFactor }: Props) {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const [value, setValue] = useState(required);
  /** Valor que se quiere guardar, a la espera de confirmación */
  const [pending, setPending] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const switchRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Tras router.refresh() manda lo que diga el servidor
  useEffect(() => setValue(required), [required]);

  // Al abrir la confirmación, el foco pasa a ella (teclado y lectores de pantalla)
  useEffect(() => {
    if (pending !== null) confirmRef.current?.focus();
  }, [pending]);

  function cancel() {
    setPending(null);
    switchRef.current?.focus();
  }

  async function save(next: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      await nestFetch(`/tenants/${tenantId}`, {
        method: "PATCH",
        body: JSON.stringify({ requireTwoFactor: next }),
      });
      setValue(next);
      setPending(null);
      setMessage({
        type: "success",
        text: next
          ? "Listo: el equipo tendrá que ingresar un código en su próximo inicio de sesión."
          : "Listo: la verificación en dos pasos vuelve a ser opcional.",
      });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "No se pudo guardar la política. Inténtalo de nuevo.") });
    } finally {
      setSaving(false);
    }
  }

  const missing = Math.max(0, teamTotal - teamWithTwoFactor);
  const share = teamTotal > 0 ? Math.round((teamWithTwoFactor / teamTotal) * 100) : 0;

  return (
    <section className="card" aria-labelledby={titleId}>
      <div className="card-header">
        <h2 id={titleId} className="card-title flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden />
          Verificación en dos pasos
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            value ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
          }`}
        >
          {value ? "Exigida al equipo" : "Opcional"}
        </span>
      </div>

      <div className="card-body space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Exigir verificación en dos pasos al equipo</p>
            <p id={descId} className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Al entrar, además de la contraseña, se pedirá un código de 6 dígitos enviado al email de cada persona. Se
              aplica a administradores y abogados; los clientes pueden activarla por su cuenta.
            </p>
          </div>
          <button
            ref={switchRef}
            type="button"
            role="switch"
            aria-checked={value}
            aria-label="Exigir verificación en dos pasos al equipo"
            aria-describedby={descId}
            disabled={saving}
            onClick={() => {
              setMessage(null);
              setPending(pending === null ? !value : null);
            }}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 motion-reduce:transition-none disabled:opacity-60 ${
              value ? "bg-brand-600" : "bg-slate-300"
            }`}
          >
            <span
              aria-hidden
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none ${
                value ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div>
          <p className="text-sm text-slate-700">
            <strong className="font-semibold tabular-nums text-slate-900">
              {teamWithTwoFactor} de {teamTotal}
            </strong>{" "}
            {teamTotal === 1 ? "miembro del equipo ya la tiene activada" : "miembros del equipo ya la tienen activada"}
            {value && missing > 0 && (
              <span className="text-slate-500">
                {" "}
                · con la política activa,{" "}
                {missing === 1
                  ? "a la persona restante también se le pide el código."
                  : `a las ${missing} restantes también se les pide el código.`}
              </span>
            )}
          </p>
          <div
            className="mt-2 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-slate-100"
            role="presentation"
          >
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${share}%` }} />
          </div>
        </div>

        {pending !== null && (
          <div
            role="group"
            aria-label="Confirmar cambio de política"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
              {pending ? "¿Exigir la verificación en dos pasos al equipo?" : "¿Dejar de exigir la verificación en dos pasos?"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              {pending
                ? missing > 0
                  ? `${missing === 1 ? "La persona del equipo que aún no la usa recibirá" : `Las ${missing} personas del equipo que aún no la usan recibirán`} un código en su email en su próximo inicio de sesión. Mientras esté exigida, nadie del equipo podrá desactivarla en su perfil.`
                  : "Todo el equipo ya la usa. Mientras esté exigida, nadie del equipo podrá desactivarla en su perfil."
                : `Cada persona decidirá si la usa. ${
                    teamWithTwoFactor > 0
                      ? "Quienes la activaron por su cuenta la mantienen."
                      : "Ahora mismo nadie del equipo la tiene activada por su cuenta, así que solo se pedirá la contraseña."
                  }`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                ref={confirmRef}
                type="button"
                onClick={() => save(pending)}
                disabled={saving}
                className="btn-primary btn-sm"
              >
                {saving && <Spinner className="h-3.5 w-3.5" />}
                {saving ? "Guardando…" : pending ? "Sí, exigirla" : "Sí, dejar de exigirla"}
              </button>
              <button type="button" onClick={cancel} disabled={saving} className="btn-ghost btn-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {message && <FormMessage type={message.type}>{message.text}</FormMessage>}
      </div>
    </section>
  );
}
