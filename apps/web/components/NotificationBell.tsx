"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Inbox } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import { useDismiss } from "@/lib/use-dismiss";
import { EmptyState, ErrorState, ListSkeleton } from "./ui";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  meta: { caseId?: string; appointmentId?: string } | null;
};

type Page<T> = { items: T[]; meta: { total: number } };

const POLL_MS = 60_000;

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace 5 minutos", "ayer"… */
function relativeTime(iso: string, now = Date.now()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "ahora";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}

/**
 * `rail`: dentro del riel oscuro del escritorio; el panel se abre a su derecha, alineado arriba.
 * `bar`: en la barra superior (móvil); el panel cae bajo el botón.
 */
export function NotificationBell({ role, placement = "bar" }: { role: string; placement?: "bar" | "rail" }) {
  const rail = placement === "rail";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState(false);
  /** false hasta la primera respuesta: no decir «Estás al día» antes de saberlo */
  const [loaded, setLoaded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const router = useRouter();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close, trigger);

  // Al abrir, el foco entra en el panel: Tab recorre sus notificaciones y Escape vuelve a la campana
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  const load = useCallback(async () => {
    try {
      const [latest, unreadPage] = await Promise.all([
        nestFetch<Page<Notification>>("/notifications?pageSize=10"),
        nestFetch<Page<Notification>>("/notifications?unreadOnly=true&pageSize=1"),
      ]);
      setItems(latest.items);
      setUnread(unreadPage.meta.total);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  async function retry() {
    setRetrying(true);
    await load();
    setRetrying(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  async function markAllRead() {
    try {
      await nestFetch("/notifications/read-all", { method: "PATCH" });
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      setError(true);
    }
  }

  async function onSelect(n: Notification) {
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      nestFetch(`/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => load());
    }
    const caseId = n.meta?.caseId;
    if (n.meta?.appointmentId) {
      setOpen(false);
      router.push(role === "CLIENTE" ? "/portal/citas" : "/agenda");
    } else if (caseId) {
      setOpen(false);
      router.push(role === "CLIENTE" ? `/portal/casos/${caseId}` : `/casos/${caseId}`);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        className={`relative flex items-center justify-center transition-[background-color,color,transform] duration-150 ease-out active:scale-95 ${
          rail
            ? "h-10 w-10 rounded-xl text-white/60 hover:bg-white/10 hover:text-white aria-expanded:bg-white/10 aria-expanded:text-white"
            : "h-9 w-9 rounded-full text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Bell className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
        {unread > 0 && (
          <span aria-hidden className={`absolute right-0.5 top-0.5 min-w-[1.05rem] rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-[1.05rem] text-white ring-2 ${rail ? "ring-rail" : "ring-surface"}`}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`animate-pop z-50 overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-0 border border-slate-200/80 bg-surface shadow-xl shadow-slate-900/10 ${
            rail
              ? "absolute left-full top-0 ml-4 w-96 origin-top-left"
              : "fixed inset-x-3 top-[3.75rem] origin-top sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:origin-top-right"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <h2 id={titleId} className="text-[0.9375rem] font-semibold text-slate-900">Notificaciones</h2>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="rounded-lg px-2 py-1 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              Marcar todas como leídas
            </button>
          </div>
          <ul className="max-h-[min(24rem,70dvh)] overflow-y-auto overscroll-contain border-t border-slate-100 p-1.5">
            {error && (
              <li className="px-2 py-2">
                <ErrorState message="No se pudieron cargar las notificaciones." onRetry={retry} retrying={retrying} />
              </li>
            )}
            {!error && !loaded && (
              <li>
                <ListSkeleton rows={3} label="Cargando notificaciones…" className="px-2 py-1" />
              </li>
            )}
            {!error && loaded && items.length === 0 && (
              <li>
                <EmptyState icon={Inbox} title="Estás al día" hint="Aquí verás cambios de tus casos, mensajes y citas." compact />
              </li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onSelect(n)}
                  className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  <span
                    aria-hidden
                    className={`mt-[7px] h-2 w-2 shrink-0 rounded-full transition-colors ${
                      n.read ? "bg-transparent" : "bg-brand-600"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    {!n.read && <span className="sr-only">Sin leer: </span>}
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${n.read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                        {n.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">{relativeTime(n.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500">{n.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
