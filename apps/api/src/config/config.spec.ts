import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DEV_JWT_SECRET, resolveJwtSecret } from './configuration';
import { findRepoRoot, resolveUploadDir } from './paths';
import { LoginDto } from '../auth/dto/login.dto';

describe('resolveJwtSecret', () => {
  it('usa JWT_SECRET si está definido', () => {
    expect(resolveJwtSecret({ JWT_SECRET: 's3cr3t', NODE_ENV: 'production' })).toBe('s3cr3t');
  });

  it('en desarrollo cae al secreto de desarrollo', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'development' })).toBe(DEV_JWT_SECRET);
  });

  it('en producción sin JWT_SECRET lanza error', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });
});

describe('findRepoRoot / resolveUploadDir', () => {
  let root: string;
  let apiDir: string;

  beforeAll(() => {
    // <tmp>/package.json (workspaces) y <tmp>/apps/api/package.json (sin workspaces)
    root = mkdtempSync(path.join(tmpdir(), 'bogados-'));
    apiDir = path.join(root, 'apps', 'api');
    mkdirSync(apiDir, { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ workspaces: ['apps/*'] }));
    writeFileSync(path.join(apiDir, 'package.json'), JSON.stringify({ name: '@bogados/api' }));
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('encuentra la raíz del monorepo desde apps/api', () => {
    expect(findRepoRoot(apiDir)).toBe(root);
  });

  it('UPLOAD_DIR relativo se resuelve desde la raíz, no desde apps/api', () => {
    expect(resolveUploadDir('./uploads', apiDir)).toBe(path.join(root, 'uploads'));
  });

  it('UPLOAD_DIR absoluto se respeta', () => {
    const abs = path.resolve(root, 'otra', 'carpeta');
    expect(resolveUploadDir(abs, apiDir)).toBe(abs);
  });
});

describe('LoginDto', () => {
  const parse = (body: Record<string, unknown>) => {
    const dto = plainToInstance(LoginDto, body, { enableImplicitConversion: true });
    return { dto, errors: validateSync(dto) };
  };

  it('exige tenantSlug', () => {
    const { errors } = parse({ email: 'a@b.co', password: 'demo1234' });
    expect(errors.map((e) => e.property)).toContain('tenantSlug');
  });

  it('normaliza tenantSlug a minúsculas sin espacios', () => {
    const { dto, errors } = parse({ email: 'a@b.co', password: 'demo1234', tenantSlug: ' Firma-Demo ' });
    expect(errors).toHaveLength(0);
    expect(dto.tenantSlug).toBe('firma-demo');
  });
});
