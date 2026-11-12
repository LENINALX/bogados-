import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotFoundException } from '@nestjs/common';
import { brandColorProblem, contrastWithWhite, phoneProblem, sniffLogo, websiteProblem } from './branding';
import { UpdateTenantDto } from './dto/tenant.dto';
import { presentTenant, TenantsService } from './tenants.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe('identidad de la firma: reglas', () => {
  it('sniffLogo reconoce PNG, JPEG y WebP por su contenido; SVG y otros no', () => {
    expect(sniffLogo(PNG)).toBe('image/png');
    expect(sniffLogo(JPEG)).toBe('image/jpeg');
    expect(sniffLogo(WEBP)).toBe('image/webp');
    expect(sniffLogo(SVG)).toBeNull();
    expect(sniffLogo(Buffer.from('%PDF-1.7'))).toBeNull();
  });

  it('el color de marca necesita contraste AA con texto blanco', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 0);
    expect(brandColorProblem('#1f3d38')).toBeNull();
    expect(brandColorProblem('#f5d76e')).toMatch(/demasiado claro/);
    expect(brandColorProblem('verde')).toMatch(/#RRGGBB/);
    expect(brandColorProblem('#fff')).toMatch(/#RRGGBB/);
  });

  it('teléfono y web', () => {
    expect(phoneProblem('+593 2 123 4567')).toBeNull();
    expect(phoneProblem('(02) 255-1234')).toBeNull();
    expect(phoneProblem('123')).toMatch(/entre 7 y 15/);
    expect(phoneProblem('099 abc 1234')).toMatch(/solo puede llevar/);
    expect(websiteProblem('https://mifirma.ec')).toBeNull();
    expect(websiteProblem('mifirma.ec')).toMatch(/completa/);
    expect(websiteProblem('javascript:alert(1)')).toMatch(/https/);
    expect(websiteProblem('https://user:pass@mifirma.ec')).toMatch(/usuario/);
    expect(websiteProblem('https://localhost')).toMatch(/dominio/);
  });
});

describe('UpdateTenantDto: contacto y marca', () => {
  const check = async (body: Record<string, unknown>) => {
    const dto = plainToInstance(UpdateTenantDto, body);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    return { dto, messages: errors.flatMap((e) => Object.values(e.constraints ?? {})) };
  };

  it('acepta datos válidos y los normaliza', async () => {
    const { dto, messages } = await check({
      brandColor: ' #1F3D38 ',
      contactEmail: ' Despacho@MiFirma.ec ',
      contactPhone: ' +593 2 123 4567 ',
      address: '  Av. Amazonas N24-03, Quito ',
      website: 'https://mifirma.ec',
    });
    expect(messages).toEqual([]);
    expect(dto).toMatchObject({
      brandColor: '#1f3d38',
      contactEmail: 'despacho@mifirma.ec',
      contactPhone: '+593 2 123 4567',
      address: 'Av. Amazonas N24-03, Quito',
    });
  });

  it('vacío o null borran el dato', async () => {
    const { dto, messages } = await check({ brandColor: '', contactEmail: null, website: '  ', contactPhone: '' });
    expect(messages).toEqual([]);
    expect(dto).toMatchObject({ brandColor: null, contactEmail: null, website: null, contactPhone: null });
  });

  it('rechaza con mensajes claros', async () => {
    const { messages } = await check({ brandColor: '#ffeeaa', contactEmail: 'despacho@ñandú.ec', website: 'ftp://x.ec' });
    const all = messages.join(' | ');
    expect(all).toMatch(/demasiado claro/);
    expect(all).toMatch(/tildes, ñ/);
    expect(all).toMatch(/https:\/\//);
  });

  it('no deja tocar el logo por PATCH (solo con su endpoint)', async () => {
    const { messages } = await check({ logoPath: '../../etc/passwd' });
    expect(messages.join(' ')).toMatch(/logoPath/);
  });
});

describe('TenantsService: logo', () => {
  const admin = { id: 'admin1', email: 'a@x.ec', role: 'ADMIN', tenantId: 't1', name: 'Admin' } as never;
  const tenant = (over = {}) => ({ id: 't1', name: 'Firma', slug: 'firma', logoPath: null, logoMime: null, ...over });
  const setup = (row: Record<string, unknown> = tenant()) => {
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn(async ({ data }) => ({ ...row, ...data })),
      },
      activityEvent: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const storage = {
      save: jest.fn().mockResolvedValue({ storagePath: 't1/marca/nuevo.png' }),
      remove: jest.fn(),
      read: jest.fn(),
    };
    return { prisma, storage, service: new TenantsService(prisma as never, storage as never) };
  };
  const file = (buffer: Buffer) => ({ buffer, size: buffer.length }) as Express.Multer.File;

  it('guarda el logo con el tipo detectado, borra el anterior y lo registra', async () => {
    const { prisma, storage, service } = setup(tenant({ logoPath: 't1/marca/viejo.png', logoMime: 'image/png' }));
    const res = await service.setLogo('t1', file(JPEG), admin);
    expect(storage.save).toHaveBeenCalledWith('t1', 'marca', 'logo.jpg', JPEG);
    expect(prisma.tenant.update.mock.calls[0][0].data).toMatchObject({
      logoPath: 't1/marca/nuevo.png',
      logoMime: 'image/jpeg',
    });
    expect(storage.remove).toHaveBeenCalledWith('t1/marca/viejo.png');
    expect(prisma.activityEvent.create.mock.calls[0][0].data.summary).toBe('Ajustes de la firma: logo cambiado');
    // La ruta interna no sale de la API
    expect(res).not.toHaveProperty('logoPath');
    expect(res).toMatchObject({ hasLogo: true });
  });

  it('un SVG o un archivo renombrado no pasa, aunque diga ser PNG', async () => {
    const { storage, service } = setup();
    await expect(service.setLogo('t1', file(SVG), admin)).rejects.toThrow(/PNG, JPG o WebP/);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('si falla la base de datos, no deja el archivo huérfano', async () => {
    const { prisma, storage, service } = setup();
    prisma.$transaction.mockRejectedValueOnce(new Error('BD caída'));
    await expect(service.setLogo('t1', file(PNG), admin)).rejects.toThrow('BD caída');
    expect(storage.remove).toHaveBeenCalledWith('t1/marca/nuevo.png');
  });

  it('otra firma no existe para mí', async () => {
    const { service } = setup();
    await expect(service.setLogo('t2', file(PNG), admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('presentTenant oculta la ruta y el tipo del logo', () => {
    expect(presentTenant(tenant({ logoPath: 'x', logoMime: 'image/png' }) as never)).toEqual({
      id: 't1',
      name: 'Firma',
      slug: 'firma',
      hasLogo: true,
    });
  });
});
