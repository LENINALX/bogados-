import { BadRequestException } from '@nestjs/common';
// El paquete raíz no reexporta MulterOptions; hay que importarlo desde su archivo
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as path from 'path';
import { fixUploadFileName } from './file-name';

export { fixUploadFileName };

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Nombre guardado y mostrado: sin rutas, sin caracteres de control y con un largo razonable. */
export const MAX_FILE_NAME_LENGTH = 180;

/**
 * Tipo MIME que se guarda y con el que se sirve cada extensión. El que declara el
 * navegador no se guarda nunca: quien sube "x.pdf" con `Content-Type: text/html`
 * no consigue que se descargue como HTML.
 */
export const CANONICAL_MIME: Readonly<Record<string, string>> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain',
};

/** Mismas extensiones que acepta el formulario de apps/web (CaseDocuments). */
export const ALLOWED_UPLOAD_EXTENSIONS = Object.keys(CANONICAL_MIME);

/**
 * Tipos que los navegadores declaran de verdad para cada extensión. Si el
 * declarado es otro (text/html, image/svg+xml, application/x-msdownload…), el
 * archivo no es lo que dice su nombre y se rechaza.
 */
const GENERIC_MIME = ['', 'application/octet-stream', 'binary/octet-stream', 'application/x-download'];
/** Así declaran algunos sistemas los .doc/.xls (formato OLE) */
const OLE_MIME = ['application/vnd.ms-office', 'application/x-ole-storage', 'application/cdfv2'];
const DECLARED_MIME: Readonly<Record<string, readonly string[]>> = {
  '.pdf': ['application/pdf', 'application/x-pdf', 'application/acrobat', 'application/vnd.pdf'],
  '.doc': ['application/msword', 'application/vnd.ms-word', 'application/doc', 'application/rtf', 'text/rtf', ...OLE_MIME],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
  ],
  '.xls': ['application/vnd.ms-excel', 'application/excel', 'application/x-excel', 'application/x-msexcel', 'application/msexcel', ...OLE_MIME],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
  ],
  '.png': ['image/png', 'image/x-png'],
  '.jpg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  '.jpeg': ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  '.txt': ['text/plain'],
};

export function uploadExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function isAllowedUpload(originalName: string): boolean {
  return Object.prototype.hasOwnProperty.call(CANONICAL_MIME, uploadExtension(originalName));
}

/** Tipo con el que se guarda y se sirve el archivo; octet-stream si la extensión no está en la lista. */
export function canonicalMimeType(fileName: string): string {
  const ext = uploadExtension(fileName);
  return Object.prototype.hasOwnProperty.call(CANONICAL_MIME, ext) ? CANONICAL_MIME[ext] : 'application/octet-stream';
}

/** ¿El tipo que declaró el navegador encaja con la extensión? */
export function isDeclaredMimeCoherent(fileName: string, declared: string | undefined): boolean {
  const ext = uploadExtension(fileName);
  const mime = (declared ?? '').split(';')[0].trim().toLowerCase();
  if (GENERIC_MIME.includes(mime)) return true;
  return (DECLARED_MIME[ext] ?? []).includes(mime);
}

/** Caracteres de control y de cambio de dirección del texto ("factura‮fdp.exe"). */
// eslint-disable-next-line no-control-regex
const UNSAFE_NAME_CHARS = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069\u200e\u200f]/g;
/** Reservados en Windows/macOS: el nombre se descarga en el equipo del usuario. */
const RESERVED_NAME_CHARS = /[<>:"|?*]/g;

/**
 * Nombre de archivo seguro para guardar y mostrar:
 * - solo el último segmento (fuera "../../etc/passwd" o "C:\\fakepath\\x.pdf");
 * - sin caracteres de control ni reservados, espacios colapsados;
 * - sin puntos ni espacios al principio/final;
 * - como mucho MAX_FILE_NAME_LENGTH caracteres, conservando la extensión.
 * Devuelve "" si no queda nada utilizable.
 */
export function sanitizeUploadFileName(raw: string): string {
  const base = (raw ?? '').normalize('NFC').split(/[\\/]/).pop() ?? '';
  let name = base
    .replace(UNSAFE_NAME_CHARS, '')
    .replace(RESERVED_NAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '');
  if (name.length > MAX_FILE_NAME_LENGTH) {
    const ext = path.extname(name).slice(0, 10);
    name = name.slice(0, MAX_FILE_NAME_LENGTH - ext.length).replace(/[\s.]+$/, '') + ext;
  }
  return name;
}

/**
 * Firma (primeros bytes) de cada formato. Un "contrato.pdf" que en realidad es
 * HTML o un ejecutable no pasa. Los .doc antiguos pueden ser OLE o RTF (Word
 * guarda así a veces); los .docx/.xlsx son ZIP.
 */
const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const RTF = [0x7b, 0x5c, 0x72, 0x74, 0x66]; // {\rtf
const SIGNATURES: Readonly<Record<string, readonly number[][]>> = {
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.docx': [ZIP],
  '.xlsx': [ZIP],
  '.doc': [OLE, RTF],
  '.xls': [OLE],
};

const startsWith = (buf: Buffer, sig: readonly number[]) =>
  buf.length >= sig.length && sig.every((byte, i) => buf[i] === byte);

/** ¿El contenido corresponde a la extensión? */
export function contentMatchesExtension(fileName: string, buffer: Buffer): boolean {
  const ext = uploadExtension(fileName);
  if (ext === '.pdf') {
    // El estándar admite basura antes de la cabecera, dentro del primer KB
    return buffer.subarray(0, 1024).includes('%PDF-');
  }
  if (ext === '.txt') {
    // Texto plano: sin bytes nulos (un binario renombrado los tiene casi siempre)
    return !buffer.subarray(0, 8192).includes(0);
  }
  const sigs = SIGNATURES[ext];
  return Boolean(sigs) && sigs.some((sig) => startsWith(buffer, sig));
}

/**
 * Multer corta la subida al superar el límite (413) en lugar de cargar el
 * archivo completo en memoria y rechazarlo después. También limita los campos
 * de texto del formulario (solo se usa `sharedWithClient`).
 */
export const documentUploadOptions: MulterOptions = {
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
    fields: 5,
    fieldSize: 1024,
    parts: 6,
  },
  fileFilter: (_req, file, cb) => {
    // Multer reutiliza este mismo objeto como req.file
    file.originalname = sanitizeUploadFileName(fixUploadFileName(file.originalname));
    if (!file.originalname || !isAllowedUpload(file.originalname)) {
      return cb(
        new BadRequestException(
          `Tipo de archivo no permitido. Usa: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`,
        ),
        false,
      );
    }
    if (!isDeclaredMimeCoherent(file.originalname, file.mimetype)) {
      return cb(
        new BadRequestException('El tipo del archivo no coincide con su extensión'),
        false,
      );
    }
    cb(null, true);
  },
};
