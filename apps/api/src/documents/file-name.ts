/** Carácter que Node inserta al decodificar bytes que no son UTF-8 válido. */
const UTF8_REPLACEMENT = String.fromCharCode(0xfffd);

/**
 * Busboy (vía Multer) decodifica `filename="..."` como latin1, pero los
 * navegadores envían los bytes en UTF-8: "Contratación" llega como "ContrataciÃ³n".
 * Se reinterpreta como UTF-8 solo si el nombre parece mal decodificado (todos los
 * caracteres ≤ 0xFF y alguno no ASCII) y el resultado es UTF-8 válido; si el
 * cliente ya lo envió bien (p. ej. con `filename*=UTF-8''`), se deja igual.
 *
 * Módulo sin dependencias de Nest: lo usa también prisma/fix-document-names.ts.
 */
export function fixUploadFileName(name: string): string {
  const codes = Array.from(name, (ch) => ch.codePointAt(0) ?? 0);
  const looksLatin1 = codes.some((c) => c > 0x7f) && codes.every((c) => c <= 0xff);
  if (!looksLatin1) return name;
  const utf8 = Buffer.from(name, 'latin1').toString('utf8');
  return utf8.includes(UTF8_REPLACEMENT) ? name : utf8;
}
