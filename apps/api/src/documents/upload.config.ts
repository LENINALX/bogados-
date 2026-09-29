import { BadRequestException } from '@nestjs/common';
// El paquete raíz no reexporta MulterOptions; hay que importarlo desde su archivo
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import * as path from 'path';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Mismas extensiones que acepta el formulario de apps/web (CaseDocuments). */
export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.txt',
];

export function isAllowedUpload(originalName: string): boolean {
  return ALLOWED_UPLOAD_EXTENSIONS.includes(path.extname(originalName).toLowerCase());
}

/** Carácter que Node inserta al decodificar bytes que no son UTF-8 válido. */
const UTF8_REPLACEMENT = String.fromCharCode(0xfffd);

/**
 * Busboy (vía Multer) decodifica `filename="..."` como latin1, pero los
 * navegadores envían los bytes en UTF-8: "Contratación" llega como "ContrataciÃ³n".
 * Se reinterpreta como UTF-8 solo si el nombre parece mal decodificado (todos los
 * caracteres ≤ 0xFF y alguno no ASCII) y el resultado es UTF-8 válido; si el
 * cliente ya lo envió bien (p. ej. con `filename*=UTF-8''`), se deja igual.
 */
export function fixUploadFileName(name: string): string {
  const codes = Array.from(name, (ch) => ch.codePointAt(0) ?? 0);
  const looksLatin1 = codes.some((c) => c > 0x7f) && codes.every((c) => c <= 0xff);
  if (!looksLatin1) return name;
  const utf8 = Buffer.from(name, 'latin1').toString('utf8');
  return utf8.includes(UTF8_REPLACEMENT) ? name : utf8;
}

/**
 * Multer corta la subida al superar el límite (413) en lugar de cargar el
 * archivo completo en memoria y rechazarlo después.
 */
export const documentUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    // Multer reutiliza este mismo objeto como req.file
    file.originalname = fixUploadFileName(file.originalname);
    if (isAllowedUpload(file.originalname)) return cb(null, true);
    cb(
      new BadRequestException(
        `Tipo de archivo no permitido. Usa: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
  },
};
