"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState, useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen, Scale, Search } from "lucide-react";
import { CASE_STATUS_LABELS, CASE_STATUSES, CaseStatus } from "@bogados/shared";
import { NavItem, isActiveLink } from "@/lib/nav";
import type { ShellData } from "@/lib/shell-data";
import { STATUS_SERIES_COLOR } from "@/lib/viz";
import { NotificationBell } from "../NotificationBell";
import { BottomNav } from "./BottomNav";
import { BrandMark } from "./BrandMark";
import { NavIcon } from "./NavIcon";
import { UserMenu } from "./UserMenu";

import { SIDEBAR_COOKIE } from "@/lib/shell-prefs";

type ShellUser = { name: string; email: string; role: string };

/** true en escritorio (≥1024px). En el servidor, false: la campana se monta tras hidratar en un solo sitio. */
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

/**
 * Armazón de la aplicación (despacho y portal), inspirado en un escritorio de trabajo:
 * - riel oscuro con las secciones (siempre visible en escritorio)
 * - barra lateral clara con perfil, grupos, recuentos y casos recientes (plegable, ≥1280px)
 * - móvil: barra superior compacta + pestañas inferiores
 */
export function ShellFrame({
  user,
  links,
  data,
  home,
  variant,
  initialCollapsed,
  children,
}: {
  user: ShellUser;
  links: NavItem[];
  data: ShellData;
  home: string;
  variant: "despacho" | "portal";
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const isDesktop = useIsDesktop();

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      // Cookie (no localStorage): el servidor la lee y pinta el estado correcto sin parpadeo
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  return (
    <div data-collapsed={collapsed} className="app-shell min-h-dvh bg-shell">
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-lg bg-surface px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Saltar al contenido
      </a>

      {/* Escritorio: riel + barra lateral flotantes */}
      <div className="fixed inset-y-0 left-0 z-40 hidden gap-3 p-3 lg:flex">
        <Rail
          links={links}
          data={data}
          home={home}
          variant={variant}
          user={user}
          bell={isDesktop}
          collapsed={collapsed}
          onExpand={toggle}
        />
        <Sidebar user={user} links={links} data={data} variant={variant} collapsed={collapsed} onCollapse={toggle} />
      </div>

      {/* Móvil y tableta: barra superior compacta */}
      <header className="material sticky top-0 z-30 border-b border-slate-200/70 lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <BrandMark href={home} />
          <div className="ml-auto flex items-center gap-1.5">
            {!isDesktop && <NotificationBell role={user.role} />}
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      {/* pb en móvil: deja sitio a las pestañas inferiores */}
      <div id="contenido" className="app-main pb-28 lg:pb-10">
        {children}
      </div>

      <BottomNav links={links} counts={data.counts} />
    </div>
  );
}

/* ── Riel ─────────────────────────────────── */

function Rail({
  links,
  data,
  home,
  variant,
  user,
  bell,
  collapsed,
  onExpand,
}: {
  links: NavItem[];
  data: ShellData;
  home: string;
  variant: "despacho" | "portal";
  user: ShellUser;
  bell: boolean;
  collapsed: boolean;
  onExpand: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex w-[4.25rem] flex-col gap-3">
      <div className="shell-capsule flex flex-1 flex-col items-center gap-4 rounded-[26px] p-1.5">
        <nav
          aria-label="Secciones"
          className="flex w-full flex-col items-center gap-1.5 rounded-[22px] bg-rail px-1.5 py-2.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_12px_28px_-12px_rgb(2_6_23/0.55)]"
        >
          <Link
            href={home}
            aria-label="Bogados, inicio"
            className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl text-white transition-transform duration-150 ease-out active:scale-95"
          >
            <Scale className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden />
          </Link>
          <span aria-hidden className="mb-1 h-px w-7 bg-white/10" />
          {links.map((l) => {
            const active = isActiveLink(l.href, pathname);
            const count = data.counts[l.href];
            const alert = data.alerts.includes(l.href) && !!count;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                aria-label={l.label}
                className={`rail-key group relative flex h-11 w-11 items-center justify-center rounded-2xl ${
                  active ? "rail-key-active text-white" : "text-white/55 hover:text-white"
                }`}
              >
                <NavIcon name={l.icon} className="h-5 w-5" strokeWidth={active ? 2.1 : 1.8} />
                {alert && <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-rail" />}
                <RailTip>{l.label}</RailTip>
              </Link>
            );
          })}
          <span aria-hidden className="my-1 h-px w-7 bg-white/10" />
          {bell ? <NotificationBell role={user.role} placement="rail" /> : <span className="h-10 w-10" />}
          {collapsed && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Mostrar la barra lateral"
              className="rail-key group relative hidden h-10 w-10 items-center justify-center rounded-xl text-white/55 hover:text-white xl:flex"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
              <RailTip>Mostrar barra lateral</RailTip>
            </button>
          )}
        </nav>
        <VerticalLabel>{`Bogados · ${new Date().getFullYear()} · ${variant === "portal" ? "Portal" : "Despacho"}`}</VerticalLabel>
      </div>

      <div className="shell-capsule flex flex-col items-center gap-4 rounded-[26px] p-1.5 pt-5">
        <VerticalLabel>Ajustes</VerticalLabel>
        <UserMenu user={user} variant="gear" />
      </div>
    </div>
  );
}

/** Etiqueta del riel: aparece a la derecha al pasar el cursor o con foco de teclado */
function RailTip({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="rail-tip pointer-events-none absolute left-full top-1/2 z-50 ml-3 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-lg"
    >
      {children}
    </span>
  );
}

function VerticalLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="select-none whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.28em] text-slate-400 [writing-mode:vertical-rl] rotate-180"
    >
      {children}
    </span>
  );
}

/* ── Barra lateral ────────────────────────── */

function Sidebar({
  user,
  links,
  data,
  variant,
  collapsed,
  onCollapse,
}: {
  user: ShellUser;
  links: NavItem[];
  data: ShellData;
  variant: "despacho" | "portal";
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Barra lateral"
      aria-hidden={collapsed}
      inert={collapsed ? ("" as unknown as boolean) : undefined}
      className="app-sidebar shell-panel hidden w-72 flex-col overflow-hidden rounded-[28px] xl:flex"
    >
      <div className="flex items-start gap-2 p-3 pb-2">
        <UserMenu user={user} variant="profile" />
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Ocultar la barra lateral"
          title="Ocultar la barra lateral"
          className="btn-ghost mt-1.5 h-8 w-8 shrink-0 rounded-lg p-0 text-slate-400 hover:text-slate-700"
        >
          <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <Group label={variant === "portal" ? "Tu portal" : "Despacho"}>
          {links.map((l) => (
            <SideLink
              key={l.href}
              href={l.href}
              label={l.label}
              icon={<NavIcon name={l.icon} className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              count={data.counts[l.href]}
              alert={data.alerts.includes(l.href)}
              active={isActiveLink(l.href, pathname)}
            />
          ))}
        </Group>

        {data.byStatus && (
          <Suspense>
            <StatusGroup byStatus={data.byStatus} openRequests={data.openRequests} />
          </Suspense>
        )}

        <Group label={variant === "portal" ? "Tus casos" : "Casos recientes"}>
          {variant === "despacho" && (
            <form action="/dashboard" role="search" className="relative mb-2">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <label htmlFor="sidebar-q" className="sr-only">
                Buscar casos
              </label>
              <input
                id="sidebar-q"
                name="q"
                type="search"
                placeholder="Buscar casos"
                className="shell-inset w-full rounded-xl py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </form>
          )}
          {data.recentCases.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-slate-400">Todavía no hay casos.</p>
          ) : (
            <ul className="shell-inset rounded-2xl p-1.5">
              {data.recentCases.map((c) => {
                const href = variant === "portal" ? `/portal/casos/${c.id}` : `/casos/${c.id}`;
                const active = pathname === href;
                return (
                  <li key={c.id}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors duration-150 ${
                        active ? "bg-slate-900/[0.06] font-medium text-slate-900" : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_SERIES_COLOR[c.status] }}
                      />
                      <span className="min-w-0 flex-1 truncate">{c.title}</span>
                      <span className="sr-only">({CASE_STATUS_LABELS[c.status]})</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Group>
      </div>
    </aside>
  );
}

/** Estados de los casos: cada uno filtra el listado del panel. */
function StatusGroup({ byStatus, openRequests }: { byStatus: Record<CaseStatus, number>; openRequests?: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = pathname === "/dashboard" ? params.get("status") : null;
  return (
    <Group label="Estado de los casos">
      {CASE_STATUSES.map((s) => (
        <SideLink
          key={s}
          href={`/dashboard?status=${s}`}
          label={CASE_STATUS_LABELS[s]}
          icon={
            <span className="flex h-[18px] w-[18px] items-center justify-center" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full ring-4 ring-slate-900/[0.04]" style={{ backgroundColor: STATUS_SERIES_COLOR[s] }} />
            </span>
          }
          count={byStatus[s]}
          active={current === s}
        />
      ))}
      {openRequests !== undefined && openRequests > 0 && (
        <SideLink
          href="/dashboard#solicitudes"
          label="Solicitudes por decidir"
          icon={
            <span className="flex h-[18px] w-[18px] items-center justify-center" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/15" />
            </span>
          }
          count={openRequests}
          active={false}
          tone="amber"
        />
      )}
    </Group>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-2 border-t border-slate-900/[0.07] pt-3 first:mt-0 first:border-t-0 first:pt-1">
      <h2 className="mb-1.5 px-3 text-[12.5px] font-medium text-slate-400">{label}</h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function SideLink({
  href,
  label,
  icon,
  count,
  active,
  alert = false,
  tone,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
  active: boolean;
  alert?: boolean;
  tone?: "amber";
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`side-link group flex items-center gap-3 rounded-[14px] px-3 py-2 text-[0.9375rem] ${
        active ? "side-link-active font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <span className={active ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span
          className={`min-w-[1.5rem] rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums ${
            alert && count > 0
              ? "bg-red-100 text-red-700"
              : tone === "amber"
                ? "bg-amber-100 text-amber-800"
                : active
                  ? "bg-slate-900/[0.06] text-slate-600"
                  : "bg-slate-900/[0.05] text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
