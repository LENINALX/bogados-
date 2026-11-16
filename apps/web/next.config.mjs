import path from "node:path";
import { fileURLToPath } from "node:url";

const standalone = process.env.NEXT_OUTPUT === "standalone";
const dev = process.env.NODE_ENV !== "production";

/** Origen de la API Nest: el navegador solo puede conectarse a ella y a la propia web. */
function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1").origin;
  } catch {
    return "";
  }
}

/**
 * Política de contenido: lo más importante es `connect-src`. Aunque algún día entrara un XSS, el
 * script no podría enviar el token ni los datos a otro dominio. Todo se sirve desde la propia web
 * (fuentes incluidas); Next necesita scripts y estilos en línea (y eval solo en desarrollo).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin()}${dev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sin «X-Powered-By: Next.js»: no hace falta anunciar la tecnología ni su versión
  poweredByHeader: false,
  ...(standalone && { output: "standalone" }),
  // Cabeceras de seguridad en todas las páginas
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Para navegadores que no entienden frame-ancestors: no se puede incrustar (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          // Solo en producción (con HTTPS): el navegador no vuelve a intentar HTTP en un año
          ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Monorepo: trazar dependencias desde la raíz (node_modules y packages/shared)
    ...(standalone && {
      outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../"),
    }),
  },
};

export default nextConfig;
