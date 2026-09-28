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

/**
 * Multer corta la subida al superar el límite (413) en lugar de cargar el
 * archivo completo en memoria y rechazarlo después.
 */
export const documentUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedUpload(file.originalname)) return cb(null, true);
    cb(
      new BadRequestException(
        `Tipo de archivo no permitido. Usa: ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
  },
};
