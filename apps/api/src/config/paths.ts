import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

/**
 * Raíz del monorepo: primer ancestro de `start` con un package.json que declare
 * `workspaces`. Si no hay ninguno (p. ej. despliegue sin monorepo), devuelve `start`.
 */
export function findRepoRoot(start = process.cwd()): string {
  let dir = path.resolve(start);
  for (;;) {
    const pkg = path.join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        if (JSON.parse(readFileSync(pkg, 'utf8')).workspaces) return dir;
      } catch {
        // package.json ilegible: seguir subiendo
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

/**
 * UPLOAD_DIR relativo se interpreta desde la raíz del monorepo, igual que en
 * prisma/seed.ts. Así la API (que arranca en apps/api) y el seed (que corre en
 * la raíz) usan la misma carpeta.
 */
export function resolveUploadDir(dir: string, start?: string): string {
  return path.isAbsolute(dir) ? dir : path.resolve(findRepoRoot(start), dir);
}
