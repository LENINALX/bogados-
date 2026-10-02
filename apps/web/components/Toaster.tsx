"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Toast = { id: number; type: "success" | "error"; text: string };
type ToastFn = (type: Toast["type"], text: string) => void;

const ToastContext = createContext<ToastFn>(() => undefined);

/** Confirmaciones breves de acciones (los errores de formulario siguen inline, junto a su causa). */
export function useToast() {
  return useContext(ToastContext);
}

const DURATION_MS = 3500;

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback<ToastFn>(
    (type, text) => {
      const id = ++nextId.current;
      // Como mucho 3 a la vez: el más antiguo sale primero
      setToasts((list) => [...list.slice(-2), { id, type, text }]);
      window.setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className="material animate-toast pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl border border-slate-200/80 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-lg shadow-slate-900/10"
          >
            {t.type === "success" ? (
              <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <CircleAlert className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
            )}
            {t.text}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
