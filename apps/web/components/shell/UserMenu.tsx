"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { ROLE_LABELS, UserRole } from "@bogados/shared";
import { clearNestToken } from "@/lib/nest-api";
import { ThemePreference, applyThemePreference, readThemePreference } from "@/lib/theme";
import { useDismiss } from "@/lib/use-dismiss";
import { Spinner } from "../ui";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/** Avatar → menú con identidad, tema y salir. Nace desde el avatar (origin arriba a la derecha). */
export function UserMenu({ user }: { user: { name: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [leaving, setLeaving] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, panel, close, trigger);

  useEffect(() => setTheme(readThemePreference()), []);

  return (
    <div ref={panel} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.name}`}
        className="flex items-center gap-2.5 rounded-full p-0.5 pr-0.5 transition-transform duration-100 ease-out active:scale-95 sm:pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {initials(user.name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-900">{user.name.split(" ")[0]}</span>
          <span className="block text-[11px] text-slate-500">{ROLE_LABELS[user.role as UserRole] ?? user.role}</span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-pop absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-slate-200/80 bg-surface p-1.5 shadow-xl shadow-slate-900/10"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABELS[user.role as UserRole] ?? user.role}</p>
          </div>

          <div className="mx-1.5 my-1 h-px bg-slate-100" />

          <p className="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Apariencia</p>
          <div className="mx-1.5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Tema">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => {
                  setTheme(value);
                  applyThemePreference(value);
                }}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-[background-color,color,box-shadow] duration-150 ${
                  theme === value ? "bg-surface text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <div className="mx-1.5 my-1.5 h-px bg-slate-100" />

          <button
            type="button"
            role="menuitem"
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              clearNestToken();
              signOut({ callbackUrl: "/login" });
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 active:bg-slate-200/70"
          >
            {leaving ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4 text-slate-500" aria-hidden />}
            {leaving ? "Saliendo…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
