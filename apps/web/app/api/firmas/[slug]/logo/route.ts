/**
 * Logo de una firma desde el mismo dominio de la web (pantalla de acceso, portal y emails).
 * Reenvía la imagen de la API; la API decide el tipo real del archivo al subirlo.
 */
const NEST_API_URL = (process.env.NEST_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1").replace(
  /\/$/,
  "",
);

const SLUG = /^[a-z0-9-]{1,60}$/;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase();
  if (!SLUG.test(slug)) return new Response(null, { status: 404 });

  const res = await fetch(`${NEST_API_URL}/tenants/public/${slug}/logo`, { cache: "no-store" }).catch(() => null);
  const type = res?.headers.get("content-type")?.split(";")[0] ?? "";
  if (!res?.ok || !IMAGE_TYPES.has(type)) return new Response(null, { status: res?.status === 429 ? 429 : 404 });

  return new Response(res.body, {
    headers: {
      "Content-Type": type,
      // La URL lleva ?v=<versión>: al cambiar el logo cambia la URL
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
