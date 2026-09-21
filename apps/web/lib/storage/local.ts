import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

function getUploadRoot() {
  if (process.env.UPLOAD_DIR) {
    return path.isAbsolute(process.env.UPLOAD_DIR)
      ? process.env.UPLOAD_DIR
      : path.resolve(process.cwd(), process.env.UPLOAD_DIR);
  }
  // apps/web → monorepo root /uploads
  return path.resolve(process.cwd(), "../../uploads");
}

export async function ensureUploadDir(tenantId: string, caseId: string) {
  const dir = path.join(getUploadRoot(), tenantId, caseId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveFile(
  tenantId: string,
  caseId: string,
  originalName: string,
  buffer: Buffer
): Promise<{ storagePath: string; absolutePath: string }> {
  const dir = await ensureUploadDir(tenantId, caseId);
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const fileName = `${randomUUID()}-${safe}`;
  const absolutePath = path.join(dir, fileName);
  await fs.writeFile(absolutePath, buffer);
  const storagePath = path.join(tenantId, caseId, fileName);
  return { storagePath, absolutePath };
}

export function resolveStoragePath(storagePath: string) {
  const root = path.resolve(getUploadRoot());
  const absolute = path.resolve(root, storagePath);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    throw new Error("Ruta de almacenamiento inválida");
  }
  return absolute;
}

export async function readFile(storagePath: string) {
  const absolute = resolveStoragePath(storagePath);
  return fs.readFile(absolute);
}
