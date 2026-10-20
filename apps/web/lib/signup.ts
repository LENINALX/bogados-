/** Mismas reglas que la API (RegisterFirmDto): 3-40 caracteres, minúsculas, números y guiones. */
export const FIRM_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
export const FIRM_SLUG_MAX = 40;

/** «Estudio Jurídico Mejía & Asociados» → «estudio-juridico-mejia-asociados» (corta en palabra completa). */
export function slugifyFirm(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= FIRM_SLUG_MAX) return base;
  const cut = base.slice(0, FIRM_SLUG_MAX);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 10 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

const LABELS = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte"] as const;

/** Orientativa: longitud, mezcla de tipos de caracteres y símbolos. El mínimo real lo pone la API (8). */
export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: LABELS[0] };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if ((/[a-z]/.test(pw) && /[A-Z]/.test(pw)) || (/[a-zA-Z]/.test(pw) && /\d/.test(pw))) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  // Por debajo del mínimo nunca pasa de «Débil»
  if (pw.length < 8) score = Math.min(score, 1);
  const s = Math.min(4, score) as PasswordStrength["score"];
  return { score: s, label: LABELS[s] };
}
