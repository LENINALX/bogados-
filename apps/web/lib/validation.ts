import { PROCESS_NUMBER_EXAMPLE, isValidProcessNumber, normalizeProcessNumber } from "./process-number";

/**
 * Validación de formularios en el navegador. Es la primera línea (respuesta inmediata y clara);
 * la API vuelve a validar todo con los mismos límites, así que nada de esto es la seguridad real.
 * Los límites copian los DTO de apps/api: si cambias uno, cambia el otro.
 */

export const LIMITS = {
  email: 254,
  personName: { min: 2, max: 120 },
  firmName: { min: 2, max: 120 },
  firmSlug: { min: 3, max: 40 },
  password: { min: 8, max: 72 },
  caseTitle: { min: 2, max: 200 },
  caseDescription: 5000,
  matterType: 100,
  note: 5000,
  message: 10000,
  taskTitle: { min: 2, max: 200 },
  appointmentReason: 500,
  requestDescription: { min: 10, max: 5000 },
  decisionReason: 1000,
  /** Al rechazar una solicitud el motivo es obligatorio (case-requests.service: REJECT_REASON_MIN) */
  rejectReason: 5,
  clientMessage: 1000,
  appointmentNote: 500,
  appointmentDuration: { min: 15, max: 480 },
  availabilityBlocks: 50,
  holidayName: { min: 2, max: 100 },
  /** Días hábiles de un término (terms/business-days: MAX_TERM_DAYS) */
  termDays: { min: 1, max: 90 },
  /** Número de proceso: el campo admite espacios que se quitan al normalizar */
  processNumberInput: 30,
  /** documents/upload.config.ts */
  upload: {
    maxBytes: 10 * 1024 * 1024,
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg", ".txt"],
  },
} as const;

/** Mismo criterio práctico que la API (class-validator IsEmail rechaza más casos raros). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
export const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
/** Valor de un <input type="datetime-local"> (los segundos son opcionales) */
export const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
export const FIRM_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/** Devuelve el mensaje de error o null si el valor es válido. */
export type Rule = (value: string) => string | null;

export const rules = {
  required:
    (message = "Este campo es obligatorio."): Rule =>
    (v) =>
      v.trim() ? null : message,
  minLength:
    (n: number, message?: string): Rule =>
    (v) =>
      !v.trim() || v.trim().length >= n ? null : (message ?? `Escribe al menos ${n} caracteres.`),
  maxLength:
    (n: number, message?: string): Rule =>
    (v) =>
      v.length <= n ? null : (message ?? `Máximo ${n.toLocaleString("es-EC")} caracteres (llevas ${v.length.toLocaleString("es-EC")}).`),
  email:
    (message = "Escribe un email válido, como nombre@firma.com."): Rule =>
    (v) =>
      !v.trim() || (EMAIL_RE.test(v.trim()) && v.trim().length <= LIMITS.email) ? null : message,
  pattern:
    (re: RegExp, message: string): Rule =>
    (v) =>
      !v.trim() || re.test(v.trim()) ? null : message,
  /** Contraseña nueva: longitud y que no sea solo espacios */
  newPassword: (): Rule => (v) => {
    if (!v) return "Escribe una contraseña.";
    if (!v.trim()) return "La contraseña no puede ser solo espacios.";
    if (v.length < LIMITS.password.min) return `Al menos ${LIMITS.password.min} caracteres.`;
    if (v.length > LIMITS.password.max) return `Máximo ${LIMITS.password.max} caracteres.`;
    return null;
  },
  matches:
    (other: () => string, message = "Las contraseñas no coinciden."): Rule =>
    (v) =>
      !v || v === other() ? null : message,
  /** Número entero en un rango; vacío lo decide required */
  integer:
    (min: number, max: number, message?: string): Rule =>
    (v) => {
      if (!v.trim()) return null;
      const n = Number(v.trim());
      return /^-?\d+$/.test(v.trim()) && n >= min && n <= max
        ? null
        : (message ?? `Escribe un número entero entre ${min} y ${max}.`);
    },
  /** Fecha AAAA-MM-DD que exista en el calendario (nada de 31 de febrero) */
  date:
    (message = "Escribe una fecha válida."): Rule =>
    (v) =>
      !v.trim() || isRealYmd(v.trim()) ? null : message,
  /** Fecha AAAA-MM-DD dentro de [min, max] (cualquiera de los dos puede faltar) */
  dateBetween:
    (min: string | null, max: string | null, message: string): Rule =>
    (v) => {
      const d = v.trim();
      if (!d || !isRealYmd(d)) return null;
      return (min && d < min) || (max && d > max) ? message : null;
    },
  /** Fecha y hora de un datetime-local válida */
  dateTime:
    (message = "Escribe una fecha y hora válidas."): Rule =>
    (v) =>
      !v.trim() || (DATETIME_LOCAL_RE.test(v.trim()) && isRealYmd(v.trim().slice(0, 10)) && !Number.isNaN(new Date(v.trim()).getTime()))
        ? null
        : message,
  /** Fecha y hora posterior a ahora (citas, vencimientos) */
  future:
    (message = "Elige una fecha y hora futuras.", now: () => number = Date.now): Rule =>
    (v) => {
      if (!v.trim()) return null;
      const t = new Date(v.trim()).getTime();
      return Number.isNaN(t) || t > now() ? null : message;
    },
  /** Número de proceso del SATJE (se normalizan espacios y mayúsculas antes de comprobar) */
  processNumber:
    (message = `Usa el formato del SATJE, por ejemplo ${PROCESS_NUMBER_EXAMPLE}.`): Rule =>
    (v) => {
      const n = normalizeProcessNumber(v);
      return !n || isValidProcessNumber(n) ? null : message;
    },
};

/** ¿Es AAAA-MM-DD y existe ese día? */
export function isRealYmd(value: string): boolean {
  if (!YMD_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export type Schema<K extends string> = Partial<Record<K, Rule[]>>;
export type Errors<K extends string> = Partial<Record<K, string>>;

/** Primer error de cada campo según su lista de reglas. */
export function validate<K extends string>(values: Record<K, string>, schema: Schema<K>): Errors<K> {
  const errors: Errors<K> = {};
  for (const key of Object.keys(schema) as K[]) {
    for (const rule of schema[key] ?? []) {
      const error = rule(values[key] ?? "");
      if (error) {
        errors[key] = error;
        break;
      }
    }
  }
  return errors;
}

export function hasErrors<K extends string>(errors: Errors<K>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Primer campo con error en el orden dado (para llevarle el foco). */
export function firstError<K extends string>(errors: Errors<K>, order: readonly K[]): K | undefined {
  return order.find((k) => errors[k]);
}

/** Quita espacios sobrantes y caracteres de control invisibles que llegan al pegar texto. */
export function clean(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200D\uFEFF]/g, "").trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-EC", { maximumFractionDigits: 1 })} MB`;
}

/** Archivo a subir: tipo y tamaño como los comprueba la API, antes de enviar nada. */
export function checkUpload(file: { name: string; size: number } | null | undefined): string | null {
  if (!file || !file.name) return "Elige un archivo para subir.";
  const dot = file.name.lastIndexOf(".");
  const ext = dot > 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!(LIMITS.upload.extensions as readonly string[]).includes(ext)) {
    return `Ese tipo de archivo no se admite${ext ? ` (${ext})` : ""}. Usa PDF, Word, Excel, imagen (PNG o JPG) o texto.`;
  }
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > LIMITS.upload.maxBytes) {
    return `El archivo pesa ${formatBytes(file.size)}; el máximo es ${formatBytes(LIMITS.upload.maxBytes)}.`;
  }
  return null;
}

export type TimeBlock = { weekday: number; start: string; end: string };

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Franjas semanales de disponibilidad: formato, inicio antes del fin y sin solapes el mismo día.
 * Devuelve un error (o null) por franja, en el mismo orden.
 */
export function checkTimeBlocks(blocks: readonly TimeBlock[]): (string | null)[] {
  const format: (string | null)[] = blocks.map((b) => {
    if (!HHMM_RE.test(b.start) || !HHMM_RE.test(b.end)) return "Indica la hora de inicio y la de fin.";
    if (minutes(b.end) <= minutes(b.start)) return "La hora de fin debe ser posterior a la de inicio.";
    return null;
  });
  return blocks.map((b, i) => {
    if (format[i]) return format[i];
    const clash = blocks.findIndex(
      (o, j) =>
        j !== i &&
        !format[j] &&
        o.weekday === b.weekday &&
        minutes(o.start) < minutes(b.end) &&
        minutes(b.start) < minutes(o.end),
    );
    if (clash === -1) return null;
    const o = blocks[clash];
    return `Se solapa con la franja de ${o.start} a ${o.end} del mismo día.`;
  });
}
