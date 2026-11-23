"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, CornerDownLeft, FileText, Lock, Search, User, X } from "lucide-react";
import { nestFetch } from "@/lib/nest-api";
import {
  SEARCH_MIN_LENGTH,
  SearchResponse,
  caseHref,
  clientHref,
  documentHref,
  formatBytes,
  resultCount,
} from "@/lib/global-search";
import { StatusBadge } from "../StatusBadge";
import { StateBadge } from "../portal/StateBadge";
import { clientCaseState } from "../portal/case-state";
import { EmptyState, ErrorState, ListSkeleton, NoResults, Spinner, errorMessage } from "../ui";

const DEBOUNCE_MS = 250;

/* ── Contexto: un solo diálogo para toda la aplicación, varios disparadores ── */

const SearchContext = createContext<{ open: () => void }>({ open: () => undefined });

/** Abre la búsqueda global desde cualquier botón del armazón. */
export function useGlobalSearch() {
  return useContext(SearchContext);
}

/** ¿El usuario está escribiendo en un campo? (entonces «/» es un carácter, no un atajo) */
function isTyping(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

/**
 * Búsqueda global de casos, clientes y documentos (GET /search, con los permisos de cada rol).
 * Atajos: Ctrl/⌘ + K desde cualquier sitio, «/» fuera de un campo de texto.
 */
export function GlobalSearchProvider({ role, children }: { role: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  /** Dónde estaba el foco al abrir: vuelve allí al cerrar */
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Tras desmontar el diálogo
    requestAnimationFrame(() => returnFocus.current?.focus?.());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) close();
        else open();
      } else if (e.key === "/" && !isOpen && !isTyping(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, open, close]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {isOpen && <SearchDialog role={role} onClose={close} />}
    </SearchContext.Provider>
  );
}

/** Texto del atajo según el sistema (en el servidor, «Ctrl K»). */
function useShortcutLabel() {
  const [label, setLabel] = useState("Ctrl K");
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setLabel("⌘K");
  }, []);
  return label;
}

/* ── Disparadores ─────────────────────────── */

/** Campo de la barra lateral (escritorio ancho): parece un buscador y abre la búsqueda global. */
export function SearchField({ placeholder }: { placeholder: string }) {
  const { open } = useGlobalSearch();
  const shortcut = useShortcutLabel();
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K /"
      className="shell-inset relative mb-2 flex w-full items-center rounded-xl py-2 pl-9 pr-2 text-left text-sm text-slate-500 transition-colors hover:text-slate-700"
    >
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <span className="min-w-0 flex-1 truncate">{placeholder}</span>
      <kbd aria-hidden className="ml-2 shrink-0 rounded-md border border-slate-900/[0.1] bg-surface px-1.5 py-px font-sans text-[11px] text-slate-500">
        {shortcut}
      </kbd>
    </button>
  );
}

/** Botón con icono (riel oscuro o barra superior móvil). */
export function SearchButton({ placement, children }: { placement: "rail" | "bar"; children?: React.ReactNode }) {
  const { open } = useGlobalSearch();
  const rail = placement === "rail";
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-label="Buscar casos, clientes y documentos"
      aria-keyshortcuts="Control+K Meta+K /"
      className={
        rail
          ? "rail-key group relative flex h-11 w-11 items-center justify-center rounded-xl text-white/55 hover:text-white"
          : "flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-[background-color,transform] duration-150 ease-out hover:bg-slate-100 active:scale-95"
      }
    >
      <Search className={rail ? "h-5 w-5" : "h-[19px] w-[19px]"} strokeWidth={1.9} aria-hidden />
      {children}
    </button>
  );
}

/* ── Diálogo ──────────────────────────────── */

type Option = { id: string; href: string };

type State =
  | { kind: "idle" }
  | { kind: "loading"; previous: SearchResponse | null }
  | { kind: "error"; message: string }
  | { kind: "done"; data: SearchResponse };

function SearchDialog({ role, onClose }: { role: string; onClose: () => void }) {
  const router = useRouter();
  const ids = useId();
  const titleId = `${ids}-title`;
  const listId = `${ids}-list`;
  const optionId = (key: string) => `${ids}-opt-${key}`;
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [active, setActive] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [navigating, setNavigating] = useState<string | null>(null);
  const isClient = role === "CLIENTE";

  const term = query.trim();

  // Búsqueda con espera breve tras teclear; cancela la anterior si llega una nueva
  useEffect(() => {
    if (term.length < SEARCH_MIN_LENGTH) {
      setState({ kind: "idle" });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ kind: "loading", previous: s.kind === "done" ? s.data : s.kind === "loading" ? s.previous : null }));
    const timer = window.setTimeout(() => {
      nestFetch<SearchResponse>(`/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return;
          setState({ kind: "done", data });
          setActive(0);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setState({ kind: "error", message: errorMessage(err, "No se pudo completar la búsqueda.") });
        });
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, attempt]);

  // Bloquea el desplazamiento de la página mientras el diálogo está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const data = state.kind === "done" ? state.data : state.kind === "loading" ? state.previous : null;

  /** Opciones en orden de lectura: casos → clientes → documentos */
  const options: Option[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.cases.items.map((c) => ({ id: `case-${c.id}`, href: caseHref(role, c.id) })),
      ...data.clients.items.map((c) => ({ id: `client-${c.id}`, href: clientHref(role, c) })),
      ...data.documents.items.map((d) => ({ id: `doc-${d.id}`, href: documentHref(role, d.case.id) })),
    ];
  }, [data, role]);

  const activeOption = options[Math.min(active, options.length - 1)];

  const go = useCallback(
    (opt: Option | undefined) => {
      if (!opt) return;
      setNavigating(opt.id);
      router.push(opt.href);
      onClose();
    },
    [router, onClose],
  );

  // La opción activa se mantiene a la vista al moverse con el teclado
  useEffect(() => {
    if (!activeOption) return;
    document.getElementById(optionId(activeOption.id))?.scrollIntoView({ block: "nearest" });
    // optionId es estable para este diálogo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOption]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && options.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp" && options.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(activeOption);
    }
  }

  /** Foco atrapado en el diálogo; Escape cierra */
  function onDialogKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;
    const focusable = Array.from(
      dialog.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const count = data ? resultCount(data) : 0;
  const announcement =
    state.kind === "loading" && !data
      ? "Buscando…"
      : state.kind === "done"
        ? count === 0
          ? `Sin resultados para ${term}`
          : `${count} ${count === 1 ? "resultado" : "resultados"}. Usa las flechas para recorrerlos y Intro para abrir.`
        : "";

  let indexOffset = 0;
  const section = <T,>(
    key: "cases" | "clients" | "documents",
    label: string,
    items: T[],
    hasMore: boolean,
    render: (item: T) => { id: string; icon: React.ReactNode; title: React.ReactNode; meta: React.ReactNode; aside?: React.ReactNode },
  ) => {
    if (items.length === 0) return null;
    const start = indexOffset;
    indexOffset += items.length;
    const headingId = `${ids}-${key}`;
    return (
      <div role="group" aria-labelledby={headingId} className="py-1.5">
        <p id={headingId} className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
          {label}
        </p>
        {items.map((item, i) => {
          const r = render(item);
          const index = start + i;
          const selected = index === active;
          const opt = options[index];
          return (
            <div
              key={r.id}
              id={optionId(r.id)}
              role="option"
              aria-selected={selected}
              onMouseMove={() => setActive(index)}
              onClick={() => go(opt)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-100 ${
                selected ? "bg-brand-600/[0.08]" : ""
              }`}
            >
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
                  selected ? "bg-brand-600 text-white" : "bg-slate-900/[0.05] text-slate-500"
                }`}
              >
                {r.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{r.title}</span>
                <span className="block truncate text-xs text-slate-500">{r.meta}</span>
              </span>
              {r.aside}
              {navigating === r.id ? (
                <Spinner className="h-4 w-4 shrink-0 text-slate-500" />
              ) : (
                <CornerDownLeft aria-hidden className={`h-4 w-4 shrink-0 text-slate-400 ${selected ? "opacity-100" : "opacity-0"}`} />
              )}
            </div>
          );
        })}
        {hasMore && (
          <p className="px-3 pb-1 pt-1 text-xs text-slate-500">Hay más coincidencias: escribe algo más concreto para afinar.</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[max(1rem,8vh)] sm:px-6">
      {/* Fondo: pulsar fuera cierra */}
      <div aria-hidden onClick={onClose} className="animate-fade absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onDialogKeyDown}
        className="animate-pop relative flex max-h-[min(36rem,85dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-surface shadow-2xl shadow-slate-900/20"
      >
        <h2 id={titleId} className="sr-only">
          Búsqueda global
        </h2>

        <div className="flex items-center gap-2 border-b border-slate-900/[0.07] px-3">
          {state.kind === "loading" ? (
            <Spinner className="ml-1 h-[18px] w-[18px] shrink-0 text-brand-700" />
          ) : (
            <Search aria-hidden className="ml-1 h-[18px] w-[18px] shrink-0 text-slate-500" />
          )}
          <label htmlFor={`${ids}-input`} className="sr-only">
            {isClient ? "Buscar en tus casos y documentos" : "Buscar casos, clientes y documentos"}
          </label>
          <input
            ref={input}
            id={`${ids}-input`}
            type="text"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? optionId(activeOption.id) : undefined}
            aria-describedby={`${ids}-help`}
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={isClient ? "Buscar en tus casos y documentos…" : "Buscar casos, clientes o documentos…"}
            className="h-14 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
              aria-label="Borrar la búsqueda"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-800"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-slate-900/[0.1] px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:text-slate-800"
          >
            Esc<span className="sr-only"> (cerrar la búsqueda)</span>
          </button>
        </div>

        <p role="status" className="sr-only">
          {announcement}
        </p>

        <div className="shell-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          <div
            id={listId}
            role="listbox"
            aria-label="Resultados"
            className={`transition-opacity duration-150 ${state.kind === "loading" && data ? "opacity-60" : ""}`}
          >
            {data &&
              count > 0 && (
                <>
                  {section("cases", isClient ? "Tus casos" : "Casos", data.cases.items, data.cases.hasMore, (c) => {
                    const portal = clientCaseState(c.status, c.requestState);
                    return {
                      id: `case-${c.id}`,
                      icon: <Briefcase className="h-4 w-4" />,
                      title: c.title,
                      meta: [
                        !isClient && (c.client?.name ?? "Sin cliente"),
                        c.matterType,
                        c.processNumber && `Proceso ${c.processNumber}`,
                        isClient && c.lawyer?.name && `Con ${c.lawyer.name}`,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                      aside: isClient ? (
                        <StateBadge tone={portal.tone} className="hidden sm:inline-flex">
                          {portal.label}
                        </StateBadge>
                      ) : (
                        <span className="hidden sm:inline-flex">
                          <StatusBadge status={c.status} />
                        </span>
                      ),
                    };
                  })}
                  {!isClient &&
                    section("clients", "Clientes", data.clients.items, data.clients.hasMore, (c) => ({
                      id: `client-${c.id}`,
                      icon: <User className="h-4 w-4" />,
                      title: (
                        <>
                          {c.name}
                          {!c.active && <span className="ml-1.5 text-xs font-normal text-slate-500">(inactivo)</span>}
                        </>
                      ),
                      meta: [
                        c.email,
                        c.caseCount === 0
                          ? "Sin casos"
                          : c.caseCount === 1
                            ? c.latestCase?.title
                            : `${c.caseCount} casos · último: ${c.latestCase?.title ?? ""}`,
                      ]
                        .filter(Boolean)
                        .join(" · "),
                    }))}
                  {section("documents", "Documentos", data.documents.items, data.documents.hasMore, (d) => ({
                    id: `doc-${d.id}`,
                    icon: <FileText className="h-4 w-4" />,
                    title: d.fileName,
                    meta: `${d.case.title} · ${formatBytes(d.sizeBytes)}`,
                    aside:
                      !isClient && !d.sharedWithClient ? (
                        <span className="hidden shrink-0 items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 sm:inline-flex">
                          <Lock className="h-3 w-3" aria-hidden />
                          Interno
                        </span>
                      ) : undefined,
                  }))}
                </>
              )}
          </div>

          {state.kind === "idle" && (
            <EmptyState
              icon={Search}
              title={term.length > 0 ? "Sigue escribiendo…" : isClient ? "Busca en tus casos" : "Busca en todo el despacho"}
              hint={
                term.length > 0
                  ? `Escribe al menos ${SEARCH_MIN_LENGTH} caracteres.`
                  : isClient
                    ? "Por título del caso, materia, número de proceso o nombre de un documento."
                    : "Por título, materia o número de proceso del caso, nombre o email del cliente, o nombre de un documento."
              }
              compact
            />
          )}
          {state.kind === "loading" && !data && <ListSkeleton rows={4} label="Buscando…" className="p-2" />}
          {state.kind === "error" && (
            <ErrorState message={state.message} onRetry={() => setAttempt((n) => n + 1)} className="p-3" />
          )}
          {state.kind === "done" && count === 0 && (
            <NoResults
              query={term}
              hint={
                isClient
                  ? "Revisa la ortografía o prueba con el número de proceso."
                  : "Revisa la ortografía, o prueba con el número de proceso o el email del cliente."
              }
              compact
            />
          )}
        </div>

        <div
          id={`${ids}-help`}
          className="hidden items-center gap-4 border-t border-slate-900/[0.07] px-4 py-2 text-[11px] text-slate-500 sm:flex"
        >
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-900/[0.1] px-1 font-sans">↑</kbd>
            <kbd className="rounded border border-slate-900/[0.1] px-1 font-sans">↓</kbd>
            para moverte
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-slate-900/[0.1] px-1 font-sans">Intro</kbd>
            para abrir
          </span>
          <span className="ml-auto flex items-center gap-1">
            Solo ves lo que tienes permiso para ver
          </span>
        </div>
      </div>
    </div>
  );
}
