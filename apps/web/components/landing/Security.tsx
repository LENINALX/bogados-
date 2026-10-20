import { CheckCircle2, XCircle } from "lucide-react";
import { Reveal } from "./Reveal";

const MEASURES = [
  { title: "Datos aislados por firma", text: "Cada consulta se filtra por firma: nadie ve los casos ni los clientes de otro despacho." },
  { title: "Verificación en dos pasos", text: "Un código de 6 dígitos por email que caduca a los 10 minutos. La firma puede exigirla a todo su equipo." },
  { title: "Bloqueo por intentos", text: "Tras cinco contraseñas incorrectas en 15 minutos, la cuenta se bloquea temporalmente." },
  { title: "Registro de accesos", text: "Quién entró, cuándo, con qué dispositivo y desde qué IP, y también los intentos fallidos." },
  { title: "Documentos privados", text: "Se descargan con permiso, nunca con una URL pública. Los internos no los ve el cliente." },
  { title: "Enlaces de un solo uso", text: "Las invitaciones y la recuperación de contraseña caducan y no se pueden reutilizar." },
];

const LOG = [
  { when: "19 oct 2026, 08:57", who: "Ana Torres", ok: true, reason: "Contraseña y código", device: "Chrome en Windows" },
  { when: "19 oct 2026, 08:41", who: "Ana Torres", ok: false, reason: "Contraseña incorrecta", device: "Chrome en Windows" },
  { when: "18 oct 2026, 19:12", who: "Carla Méndez", ok: true, reason: "Contraseña", device: "Safari en iPhone" },
  { when: "18 oct 2026, 16:05", who: "Luis Zambrano", ok: false, reason: "Código caducado", device: "Edge en Windows" },
];

/** Banda oscura en ambos temas (como el panel de marca del acceso), con medidas reales y un extracto del registro. */
export function Security() {
  return (
    <section
      id="seguridad"
      aria-labelledby="seguridad-title"
      className="auth-grain relative isolate scroll-mt-16 overflow-hidden border-y border-slate-900/[0.08] bg-[#111b19] py-20 text-white sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_10%_0%,rgb(52_96_88/0.5),transparent_65%)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal>
            <p className="text-[13px] font-medium text-white/50">Seguridad</p>
            <h2
              id="seguridad-title"
              className="mt-4 text-balance font-display text-[clamp(2rem,3.6vw,2.875rem)] font-normal leading-[1.08] tracking-[-0.02em] text-[#f4efe4]"
            >
              Lo que tus clientes te confían, <em className="font-light italic text-[#e0a593]">bajo llave.</em>
            </h2>
            <p className="mt-5 max-w-md text-pretty text-[0.9375rem] leading-relaxed text-white/60">
              Trabajas con información sensible. Bogados la separa por firma, pide algo más que una contraseña y deja
              constancia de cada acceso.
            </p>
          </Reveal>

          {/* Extracto del registro de accesos de la firma (decorativo, datos de ejemplo) */}
          <Reveal delay={120} className="min-w-0">
            <div
              aria-hidden
              className="overflow-hidden rounded-xl bg-[#fcfaf5] text-[#171511] shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_30px_70px_-30px_rgb(0_0_0/0.85),0_8px_20px_-12px_rgb(0_0_0/0.5)] ring-1 ring-black/5"
            >
              <div className="flex items-center justify-between gap-4 px-5 py-3.5">
                <p className="text-[14px] font-semibold tracking-[-0.005em]">Registro de accesos</p>
                <span className="rounded-md bg-[#9c4a3c]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#7f3e33]">
                  2 fallidos en 24 h
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-y border-[#171511]/[0.07] bg-[#f4efe4]/60 px-5 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[#171511]/50 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto]">
                <span className="hidden sm:block">Fecha</span>
                <span>Persona</span>
                <span>Resultado</span>
              </div>
              <ul className="divide-y divide-[#171511]/[0.06]">
                {LOG.map((e) => (
                  <li
                    key={e.when}
                    className={`grid min-h-[3.25rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-2 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] ${
                      e.ok ? "" : "bg-[#9c4a3c]/[0.04]"
                    }`}
                  >
                    <span className="hidden text-[12.5px] tabular-nums text-[#171511]/60 sm:block">{e.when}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{e.who}</span>
                      <span className="block truncate text-[11.5px] text-[#171511]/50">
                        {e.reason} · {e.device}
                      </span>
                    </span>
                    {e.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#3f6b56]/[0.12] px-1.5 py-0.5 text-[11px] font-medium text-[#2f5242]">
                        <CheckCircle2 className="h-3 w-3" />
                        Correcto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#9c4a3c]/10 px-1.5 py-0.5 text-[11px] font-medium text-[#7f3e33]">
                        <XCircle className="h-3 w-3" />
                        Fallido
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {MEASURES.map((m, i) => (
            <Reveal as="li" key={m.title} delay={(i % 3) * 80} className="border-t border-white/[0.12] pt-5">
              <h3 className="text-[0.9375rem] font-semibold tracking-[-0.006em] text-[#f4efe4]">{m.title}</h3>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-white/55">{m.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
