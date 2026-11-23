"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

type Toast = { id: number; type: "success" | "error"; text: string };
type ToastFn = (type: Toast["type"], text: string) => void;

const ToastContext = createContext<ToastFn>(() => undefined);

/** Confirmaciones breves de acciones (los errores de formulario siguen inline, junto a su causa). */
export function useToast() {
  return useContext(ToastContext);
}

const DURATION_MS = 3500;
/** Los errores se quedan más tiempo: hay que poder leerlos */
const ERROR_DURATION_MS = 6000;

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback(
    (t: Toast) => {
      window.clearTimeout(timers.current.get(t.id));
      timers.current.set(
        t.id,
        window.setTimeout(() => dismiss(t.id), t.type === "error" ? ERROR_DURATION_MS : DURATION_MS),
      );
    },
    [dismiss],
  );

  /** Con el puntero o el foco encima el aviso no se va (WCAG 2.2.1) */
  const pause = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const toast = useCallback<ToastFn>(
    (type, text) => {
      const t = { id: ++nextId.current, type, text };
      // Como mucho 3 a la vez: el más antiguo sale primero
      setToasts((list) => [...list.slice(-2), t]);
      schedule(t);
    },
    [schedule],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Dos regiones vivas: las confirmaciones esperan su turno, los errores se anuncian enseguida */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
        <div aria-live="polite" aria-atomic="false" className="flex flex-col items-center gap-2 lg:items-end">
          {toasts.filter((t) => t.type === "success").map((t) => (
            <ToastItem key={t.id} t={t} onDismiss={dismiss} onPause={pause} onResume={schedule} />
          ))}
        </div>
        <div aria-live="assertive" aria-atomic="false" className="flex flex-col items-center gap-2 lg:items-end">
          {toasts.filter((t) => t.type === "error").map((t) => (
            <ToastItem key={t.id} t={t} onDismiss={dismiss} onPause={pause} onResume={schedule} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  t,
  onDismiss,
  onPause,
  onResume,
}: {
  t: Toast;
  onDismiss: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (t: Toast) => void;
}) {
  return (
    <div
      role={t.type === "error" ? "alert" : "status"}
      onMouseEnter={() => onPause(t.id)}
      onMouseLeave={() => onResume(t)}
      onFocus={() => onPause(t.id)}
      onBlur={() => onResume(t)}
      className="material animate-toast pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl border border-slate-200/80 py-3 pl-4 pr-2 text-left text-sm font-medium text-slate-800 shadow-lg shadow-slate-900/10"
    >
      {t.type === "success" ? (
        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <CircleAlert className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
      )}
      <span className="min-w-0 flex-1">{t.text}</span>
      <button
        type="button"
        onClick={() => onDismiss(t.id)}
        aria-label="Cerrar aviso"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-900/[0.06] hover:text-slate-800"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
