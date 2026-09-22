import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(private config: ConfigService) {
    this.root = path.resolve(
      process.cwd(),
      this.config.get<string>('uploadDir', './uploads'),
    );
  }

  async save(
    tenantId: string,
    caseId: string,
    originalName: string,
    buffer: Buffer,
  ): Promise<{ storagePath: string }> {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dir = path.join(this.root, tenantId, caseId);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
    const full = path.join(dir, filename);
    await fs.writeFile(full, buffer);
    const relative = path.relative(this.root, full);
    return { storagePath: relative };
  }

  async read(storagePath: string): Promise<Buffer> {
    const full = path.join(this.root, storagePath);
    return fs.readFile(full);
  }

  resolvePath(storagePath: string): string {
    return path.join(this.root, storagePath);
  }
}
