/**
 * Cabecera Content-Disposition para descargar un archivo conservando su nombre
 * (RFC 6266): `filename` ASCII de respaldo + `filename*` en UTF-8, que los
 * navegadores actuales prefieren. "Contratación.pdf" se descarga con su tilde.
 */
export function attachmentDisposition(fileName: string): string {
  const asciiFallback = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes: "ó" → "o"
    .replace(/[^\x20-\x7e]|["\\]/g, '_'); // resto de no-ASCII, comillas y barras
  // encodeURIComponent deja sin codificar ' ( ) *, que RFC 5987 no admite
  const utf8 = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8}`;
}
