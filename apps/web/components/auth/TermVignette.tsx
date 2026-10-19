import { CalendarOff, Mail, Scale } from "lucide-react";

/**
 * Viñeta del panel de marca: un término real contándose. Notificación el jueves 29 de octubre de 2026,
 * término de 3 días hábiles: cuenta el viernes, salta el fin de semana y los feriados del 2 y 3 de
 * noviembre, y vence el jueves 5. Es el resultado exacto de computeTermDeadline() de la API.
 *
 * Tres capas de movimiento: la tarjeta (principal), los días contándose y el aviso al cliente
 * (secundarias) y la tarjeta de feriados detrás (ambiente). Sin JavaScript: con movimiento reducido
 * se ve todo quieto y completo.
 */
type Day = {
  dow: string;
  n: number;
  kind: "notified" | "counted" | "weekend" | "holiday" | "due";
  count?: number;
};

const DAYS: Day[] = [
  { dow: "jue", n: 29, kind: "notified" },
  { dow: "vie", n: 30, kind: "counted", count: 1 },
  { dow: "sáb", n: 31, kind: "weekend" },
  { dow: "dom", n: 1, kind: "weekend" },
  { dow: "lun", n: 2, kind: "holiday" },
  { dow: "mar", n: 3, kind: "holiday" },
  { dow: "mié", n: 4, kind: "counted", count: 2 },
  { dow: "jue", n: 5, kind: "due", count: 3 },
];

/** Momento en que empieza a contarse cada día (ms): la tarjeta ya se ha posado */
const COUNT_START = 760;
const STEP = 60;

function Marker({ day }: { day: Day }) {
  switch (day.kind) {
    case "notified":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[#171511]/35 text-[10px] font-semibold text-[#171511]/60">
          N
        </span>
      );
    case "counted":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f3d38] text-[11px] font-semibold text-[#f4efe4]">
          {day.count}
        </span>
      );
    case "due":
      return (
        <span className="tv-due flex h-6 w-6 items-center justify-center rounded-full bg-[#9c4a3c] text-[11px] font-semibold text-white ring-4 ring-[#9c4a3c]/15">
          {day.count}
        </span>
      );
    case "holiday":
      return (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#9c4a3c]/10 text-[#9c4a3c]">
          <CalendarOff className="h-3 w-3" />
        </span>
      );
    default:
      return <span className="block h-px w-3 bg-[#171511]/25" />;
  }
}

export function TermVignette() {
  return (
    <div className="relative mt-10 h-[23rem] w-full max-w-[30rem] [@media(max-height:820px)]:mt-6">
      {/* Ambiente: feriados del mes, de cristal, detrás y desplazada */}
      <div
        className="tv-drift absolute -top-2 right-0 w-[15.5rem] rounded-xl border border-white/[0.14] bg-white/[0.07] px-4 pb-8 pt-4 text-white shadow-[0_20px_40px_-24px_rgb(0_0_0/0.8)] backdrop-blur-md"
        style={{ animationDelay: "320ms" }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">
          <CalendarOff className="h-3 w-3" /> Feriados · noviembre
        </p>
        <ul className="mt-2.5 space-y-1.5 text-[12px] text-white/80">
          <li className="flex justify-between gap-3">
            <span>Día de los Difuntos</span>
            <span className="tabular-nums text-white/50">lun 2</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Independencia de Cuenca</span>
            <span className="tabular-nums text-white/50">mar 3</span>
          </li>
        </ul>
      </div>

      {/* Principal: el término */}
      <div
        className="tv-rise absolute left-0 top-[6rem] w-[min(100%,27rem)] overflow-hidden rounded-xl bg-[#fcfaf5] text-[#171511] shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_30px_70px_-30px_rgb(0_0_0/0.85),0_8px_20px_-12px_rgb(0_0_0/0.5)] ring-1 ring-black/5"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-[-0.005em]">Contestar la demanda</p>
            <p className="mt-0.5 truncate text-xs text-[#171511]/55">Laboral · despido intempestivo</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#1f3d38]/[0.08] px-2 py-1 text-[11px] font-medium text-[#1f3d38]">
            <Scale className="h-3 w-3" />3 días hábiles
          </span>
        </div>

        <ol className="grid grid-cols-8 border-y border-[#171511]/[0.07] bg-[#f4efe4]/60 px-3 py-3">
          {DAYS.map((day, i) => {
            const skipped = day.kind === "weekend" || day.kind === "holiday";
            return (
              <li
                key={`${day.dow}-${day.n}`}
                className={`tv-day flex flex-col items-center gap-1.5 ${skipped ? "text-[#171511]/35" : "text-[#171511]/80"}`}
                style={{ animationDelay: `${COUNT_START + i * STEP}ms` }}
              >
                <span className="text-[10px] uppercase tracking-[0.06em]">{day.dow}</span>
                <span className={`text-[13px] font-medium tabular-nums ${skipped ? "line-through decoration-[#171511]/30" : ""}`}>
                  {day.n}
                </span>
                <span className="flex h-6 items-center">
                  <Marker day={day} />
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex items-end justify-between gap-4 px-5 py-3.5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#171511]/45">Vence</p>
            <p className="mt-0.5 text-[14px] font-semibold">
              Jueves 5 de noviembre, <span className="tabular-nums">23:59</span>
            </p>
          </div>
          <p className="max-w-[9.5rem] text-right text-[11px] leading-snug text-[#171511]/50">
            Sin contar el fin de semana ni 2 feriados
          </p>
        </div>
      </div>

      {/* Secundaria: el cliente queda informado */}
      <div
        className="tv-chip absolute bottom-0 left-6 z-10 flex items-center gap-3 rounded-xl bg-[#1f3d38] py-2.5 pl-3 pr-4 text-white shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)] ring-1 ring-white/10"
        style={{ animationDelay: `${COUNT_START + DAYS.length * STEP + 260}ms` }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
          <Mail className="h-3.5 w-3.5" />
        </span>
        <span className="leading-tight">
          <span className="block text-[12px] font-medium">Aviso enviado a la clienta</span>
          <span className="block text-[11px] text-white/55">«Tu caso ahora está: Abierto»</span>
        </span>
      </div>
    </div>
  );
}
