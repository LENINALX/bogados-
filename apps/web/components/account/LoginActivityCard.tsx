import { CheckCircle2, History, ShieldCheck, XCircle } from "lucide-react";
import { LoginEvent, formatLoginDate, loginReasonLabel } from "@/lib/login-events";
import { EmptyState } from "@/components/ui";

type Props = {
  events: LoginEvent[];
  lastLoginAt: string | null;
  timeZone: string;
};

/** Últimos accesos a la cuenta (correctos y fallidos), en la hora del bufete. */
export function LoginActivityCard({ events, lastLoginAt, timeZone }: Props) {
  return (
    <section className="card overflow-hidden" aria-labelledby="activity-title">
      <div className="card-header">
        <h2 id="activity-title" className="card-title flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" aria-hidden />
          Actividad reciente
        </h2>
      </div>

      <p className="border-b border-slate-900/[0.06] px-4 py-3 text-sm text-slate-600 sm:px-5">
        Último acceso:{" "}
        <span className="font-medium text-slate-900">
          {lastLoginAt ? <time dateTime={lastLoginAt}>{formatLoginDate(lastLoginAt, timeZone)}</time> : "sin registros"}
        </span>
      </p>

      {events.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Aún no hay accesos registrados"
          hint="Aquí verás los últimos intentos de entrar a tu cuenta, correctos o fallidos."
        />
      ) : (
        <ul className="divide-y divide-slate-900/[0.06]" aria-label="Últimos accesos">
          {events.map((ev) => (
            <li
              key={ev.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors duration-150 sm:px-5 ${ev.success ? "hover:bg-slate-900/[0.02]" : "bg-red-50/60"}`}
            >
              {ev.success ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="min-w-0 break-words text-sm font-medium text-slate-900">
                    <span className="sr-only">{ev.success ? "Acceso correcto: " : "Acceso fallido: "}</span>
                    {ev.device}
                  </span>
                  <time dateTime={ev.createdAt} className="shrink-0 text-xs tabular-nums text-slate-500">
                    {formatLoginDate(ev.createdAt, timeZone)}
                  </time>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className={ev.success ? "" : "font-medium text-red-700"}>{loginReasonLabel(ev.reason)}</span>
                  <span aria-hidden>·</span>
                  <span className="min-w-0 break-all">
                    IP {ev.ip ? <span className="font-mono">{ev.ip}</span> : "desconocida"}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-slate-900/[0.06] bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 sm:px-5">
        ¿No reconoces algún acceso? Cambia tu contraseña y activa la verificación en dos pasos.
      </p>
    </section>
  );
}
