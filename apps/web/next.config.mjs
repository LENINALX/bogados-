import path from "node:path";
import { fileURLToPath } from "node:url";

const standalone = process.env.NEXT_OUTPUT === "standalone";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Solo en la imagen Docker (NEXT_OUTPUT=standalone): servidor autocontenido
  // que incluye únicamente las dependencias que usa. En local no cambia nada.
  ...(standalone && { output: "standalone" }),
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
