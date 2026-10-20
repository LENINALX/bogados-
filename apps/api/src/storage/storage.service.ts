import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { resolveUploadDir } from '../config/paths';

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private config: ConfigService) {
    this.root = resolveUploadDir(this.config.get<string>('uploadDir', './uploads'));
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(storagePath));
      return true;
    } catch {
      return false;
    }
  }

  async save(
    tenantId: string,
    caseId: string,
    originalName: string,
    buffer: Buffer,
  ): Promise<{ storagePath: string }> {
    // En disco solo ASCII seguro y corto: el nombre real va en la BD
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    const dir = this.resolvePath(path.join(tenantId, caseId));
    await fs.mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
    const full = path.join(dir, filename);
    await fs.writeFile(full, buffer);
    const relative = path.relative(this.root, full);
    return { storagePath: relative };
  }

  /** Borra el archivo si existe; nunca lanza (se usa al deshacer una subida). */
  async remove(storagePath: string): Promise<void> {
    try {
      await fs.rm(this.resolvePath(storagePath), { force: true });
    } catch {
      // nada que deshacer
    }
  }

  async read(storagePath: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(storagePath));
  }

  /** Ruta absoluta dentro de la carpeta de subidas; nunca fuera de ella (p. ej. con "../"). */
  resolvePath(storagePath: string): string {
    const full = path.resolve(this.root, storagePath);
    const rel = path.relative(this.root, full);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('Ruta de almacenamiento fuera de la carpeta de subidas');
    }
    return full;
  }
}
