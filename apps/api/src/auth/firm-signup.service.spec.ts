import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { buildWelcomeEmail, FirmSignupService } from './firm-signup.service';

describe('FirmSignupService', () => {
  const dto = {
    firmName: 'Estudio Jurídico Mejía',
    slug: 'estudio-mejia',
    name: 'Paola Mejía',
    email: 'paola@estudiomejia.ec',
    password: 'una-clave-segura',
  };
  let prisma: {
    tenant: { findUnique: jest.Mock; create: jest.Mock };
    user: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let mail: { send: jest.Mock };
  let terms: { loadNationalHolidays: jest.Mock };
  const config = (enabled = true) => ({ get: (k: string, d: unknown) => (k === 'signup.enabled' ? enabled : d) });
  const make = (enabled = true) => new FirmSignupService(prisma as never, mail as never, terms as never, config(enabled) as never);

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(async ({ data }) => ({ id: 't9', ...data })),
      },
      user: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    mail = { send: jest.fn() };
    terms = { loadNationalHolidays: jest.fn().mockResolvedValue({ created: 11, skipped: 0 }) };
  });

  it('crea la firma y su administrador en una transacción, con la contraseña cifrada', async () => {
    await expect(make().register(dto)).resolves.toEqual({
      firm: { name: 'Estudio Jurídico Mejía', slug: 'estudio-mejia' },
      email: 'paola@estudiomejia.ec',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const user = prisma.user.create.mock.calls[0][0].data;
    expect(user).toMatchObject({ tenantId: 't9', email: dto.email, role: Role.ADMIN, active: true });
    expect(user.passwordHash).not.toBe(dto.password);
    expect(await bcrypt.compare(dto.password, user.passwordHash)).toBe(true);
  });

  it('carga los feriados nacionales de este año y el siguiente', async () => {
    await make().register(dto);
    const years = terms.loadNationalHolidays.mock.calls.map((c) => c[1]);
    expect(terms.loadNationalHolidays).toHaveBeenCalledWith('t9', expect.any(Number));
    expect(years[1] - years[0]).toBe(1);
  });

  it('envía la bienvenida con el código de firma y el enlace para entrar', async () => {
    await make().register(dto);
    const sent = mail.send.mock.calls[0][0];
    expect(sent.to).toBe(dto.email);
    expect(sent.text).toContain('Código de firma: estudio-mejia');
    expect(sent.text).toContain('/login?firma=estudio-mejia&email=paola%40estudiomejia.ec');
  });

  it('si fallan los feriados o el correo, la firma queda creada igual', async () => {
    const svc = make();
    jest.spyOn(svc['logger'], 'error').mockImplementation(() => undefined);
    terms.loadNationalHolidays.mockRejectedValue(new Error('db'));
    mail.send.mockRejectedValue(new Error('smtp'));
    await expect(svc.register(dto)).resolves.toMatchObject({ firm: { slug: 'estudio-mejia' } });
  });

  it('código ocupado: 409 con una alternativa libre', async () => {
    prisma.tenant.findUnique.mockImplementation(async ({ where }) => (where.slug === 'estudio-mejia' ? { id: 'x' } : null));
    const err = await make().register(dto).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse().error).toEqual({ code: 'SLUG_TAKEN', suggestion: 'estudio-mejia-2' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dos altas simultáneas con el mismo código: la segunda recibe 409, no un error 500', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: Prisma.prismaVersion.client }),
    );
    await expect(make().register(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('con el registro cerrado responde 403 y no crea nada', async () => {
    await expect(make(false).register(dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.tenant.create).not.toHaveBeenCalled();
  });

  it('checkSlug: formato, reservados, ocupados y libres', async () => {
    const svc = make();
    await expect(svc.checkSlug('Mi Firma')).resolves.toMatchObject({ available: false, reason: 'invalid' });
    await expect(svc.checkSlug('-mal-')).resolves.toMatchObject({ available: false, reason: 'invalid' });
    await expect(svc.checkSlug('admin')).resolves.toMatchObject({ available: false, reason: 'taken', suggestion: 'admin-2' });
    await expect(svc.checkSlug(' Estudio-Mejia ')).resolves.toEqual({ slug: 'estudio-mejia', available: true });
  });

  it('la bienvenida escapa el HTML de los datos', () => {
    const e = buildWelcomeEmail({ name: '<b>Ana</b>', firmName: 'X & Y', slug: 'x-y', loginUrl: 'http://l' });
    expect(e.html).toContain('&#60;b&#62;Ana');
    expect(e.html).toContain('X &#38; Y');
  });
});
