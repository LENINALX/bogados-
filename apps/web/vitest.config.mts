import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mismo alias que tsconfig ("@/lib/...")
    alias: { "@": root },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // @bogados/shared se publica como TypeScript sin compilar: Vitest debe transformarlo
    server: { deps: { inline: ["@bogados/shared"] } },
  },
});
