/**
 * La última firma con la que se entró desde este navegador: así no hay que volver a
 * escribir el código de firma cada vez. Es una comodidad: si el almacenamiento falla
 * (navegación privada, bloqueado), simplemente se pide el código.
 */
export type RememberedFirm = { slug: string; name: string };

const KEY = "bogados:last-firm";

export function readRememberedFirm(): RememberedFirm | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<RememberedFirm>;
    return typeof v.slug === "string" && typeof v.name === "string" && v.slug ? { slug: v.slug, name: v.name } : null;
  } catch {
    return null;
  }
}

export function rememberFirm(firm: RememberedFirm) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(firm));
  } catch {
    // Sin almacenamiento: la próxima vez se pedirá el código
  }
}

export function forgetFirm() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nada que hacer
  }
}

/** Como lo guarda la API: minúsculas y sin espacios alrededor. */
export function normalizeFirmSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
