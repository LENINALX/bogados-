"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getNestToken, nestFetch } from "@/lib/nest-api";

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  meta: { caseId?: string } | null;
};

type Page<T> = { items: T[]; meta: { total: number } };

const POLL_MS = 60_000;

export function NotificationBell({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!getNestToken()) return;
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
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

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
    if (caseId) {
      setOpen(false);
      router.push(role === "CLIENTE" ? `/portal/casos/${caseId}` : `/casos/${caseId}`);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-800">Notificaciones</span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="text-xs font-medium text-brand-700 hover:underline disabled:text-slate-300 disabled:no-underline"
            >
              Marcar todas como leídas
            </button>
          </div>
          <ul className="max-h-96 divide-y overflow-y-auto">
            {error && (
              <li className="px-4 py-3 text-xs text-red-600">
                No se pudieron cargar las notificaciones.
              </li>
            )}
            {!error && items.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-slate-400">Sin notificaciones</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onSelect(n)}
                  className={`flex w-full gap-2 px-4 py-3 text-left hover:bg-slate-50 ${
                    n.read ? "" : "bg-brand-50/60"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.read ? "bg-transparent" : "bg-brand-700"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className={`block text-sm ${n.read ? "text-slate-600" : "font-semibold text-slate-800"}`}>
                      {n.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString("es-EC")}
                    </span>
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
