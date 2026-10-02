/**
 * Tema: "system" sigue la preferencia del sistema; "light"/"dark" lo fuerzan
 * con data-theme en <html> (globals.css define los tokens de cada uno).
 */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "bogados-theme";

export function readThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Aplica el tema con una transición breve de color (sin saltos bruscos de brillo). */
export function applyThemePreference(pref: ThemePreference) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) root.classList.add("theme-transition");
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Sin almacenamiento (modo privado): el tema vale para esta visita
  }
  if (!reduce) window.setTimeout(() => root.classList.remove("theme-transition"), 260);
}

/**
 * Script en <head> que aplica el tema guardado antes del primer pintado
 * (evita el destello de tema claro al cargar en oscuro).
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;
