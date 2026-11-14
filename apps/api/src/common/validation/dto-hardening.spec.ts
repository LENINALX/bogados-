import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCaseDto, ListCasesQueryDto, PatchStatusDto, UpdateCaseDto } from '../../cases/dto/case.dto';
import { CreateCaseRequestDto, DecideCaseRequestDto } from '../../cases/dto/case-request.dto';
import { CreateMessageDto, ListMessagesQueryDto } from '../../messages/dto/message.dto';
import { CreateNoteDto } from '../../notes/dto/note.dto';
import { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from '../../tasks/dto/task.dto';
import { UpdateTenantDto } from '../../tenants/dto/tenant.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { CreateHolidayDto, TermDeadlineQueryDto } from '../../terms/dto/terms.dto';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from '../../users/dto/user.dto';
import {
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentStatusDto,
} from '../../appointments/dto/appointment.dto';
import { PaginationQueryDto } from '../dto/pagination.dto';

/** Igual que el ValidationPipe global de main.ts. */
async function run<T extends object>(cls: ClassConstructor<T>, plain: Record<string, unknown>) {
  // Igual que el ValidationPipe de main.ts: sin conversión implícita
  const dto = plainToInstance(cls, plain, { enableImplicitConversion: false });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, errors, fields: errors.map((e) => e.property) };
}

describe('Textos obligatorios: «   » no pasa', () => {
  it.each([
    [CreateCaseDto, { title: '   ' }, 'title'],
    [CreateCaseRequestDto, { title: '   ', description: 'Me despidieron sin pagar' }, 'title'],
    [CreateCaseRequestDto, { title: 'Despido', description: '          ' }, 'description'],
    [CreateMessageDto, { body: '   \n  ' }, 'body'],
    [CreateNoteDto, { body: '    ' }, 'body'],
    [CreateTaskDto, { title: '   ', dueAt: '2026-10-15T18:00:00.000Z' }, 'title'],
    [CreateHolidayDto, { date: '2026-11-04', name: '  ' }, 'name'],
    [CreateUserDto, { email: 'a@b.ec', name: '   ', role: 'ABOGADO' }, 'name'],
    [UpdateCaseDto, { title: '  ' }, 'title'],
    [UpdateTaskDto, { title: '  ' }, 'title'],
    [UpdateTenantDto, { name: '   ' }, 'name'],
  ] as const)('%p %j', async (cls, plain, field) => {
    const { fields } = await run(cls as ClassConstructor<object>, plain);
    expect(fields).toContain(field);
  });

  it('el texto se guarda recortado', async () => {
    const { dto, errors } = await run(CreateMessageDto, { body: '  Hola, abogado  ' });
    expect(errors).toHaveLength(0);
    expect(dto.body).toBe('Hola, abogado');
  });

  it('la descripción mínima de una solicitud cuenta sin espacios', async () => {
    const { errors } = await run(CreateCaseRequestDto, { title: 'Despido', description: '   corto    ' });
    expect(errors[0].constraints).toEqual(
      expect.objectContaining({ minLength: 'Cuéntanos un poco más (mínimo 10 caracteres)' }),
    );
  });
});

describe('Longitudes máximas', () => {
  it.each([
    [CreateCaseDto, { title: 'x'.repeat(201) }, 'title'],
    [CreateCaseDto, { title: 'Caso', description: 'x'.repeat(5001) }, 'description'],
    [CreateMessageDto, { body: 'x'.repeat(10_001) }, 'body'],
    [CreateNoteDto, { body: 'x'.repeat(5001) }, 'body'],
    [PatchStatusDto, { status: 'abierto', clientMessage: 'x'.repeat(1001) }, 'clientMessage'],
    [DecideCaseRequestDto, { decision: 'rechazar', reason: 'x'.repeat(1001) }, 'reason'],
    [UpdateAppointmentStatusDto, { status: 'cancelada', note: 'x'.repeat(501) }, 'note'],
    [ListCasesQueryDto, { q: 'x'.repeat(201) }, 'q'],
    [ListUsersQueryDto, { q: 'x'.repeat(201) }, 'q'],
    [CreateUserDto, { email: `${'a'.repeat(250)}@b.ec`, name: 'Ana', role: 'ABOGADO' }, 'email'],
  ] as const)('%p %#', async (cls, plain, field) => {
    const { fields } = await run(cls as ClassConstructor<object>, plain);
    expect(fields).toContain(field);
  });
});

describe('Campos que permitirían escalar privilegios o tocar otra firma', () => {
  it.each([
    [CreateCaseDto, { title: 'Caso', tenantId: 'otra-firma' }, 'tenantId'],
    [UpdateCaseDto, { requestState: 'aceptada' }, 'requestState'],
    [UpdateCaseDto, { tenantId: 'otra-firma' }, 'tenantId'],
    [CreateNoteDto, { body: 'Nota', authorId: 'otro' }, 'authorId'],
    [CreateMessageDto, { body: 'Hola', senderId: 'otro' }, 'senderId'],
    [UpdateUserDto, { tenantId: 'otra-firma' }, 'tenantId'],
    [UpdateUserDto, { passwordHash: 'x' }, 'passwordHash'],
    [UpdateTenantDto, { id: 'otra-firma' }, 'id'],
    [CreateAppointmentDto, { startsAt: '2026-11-02T14:00:00.000Z', status: 'confirmada' }, 'status'],
  ] as const)('%p rechaza %j', async (cls, plain, field) => {
    const { fields } = await run(cls as ClassConstructor<object>, plain);
    expect(fields).toContain(field);
  });

  it('el rol solo puede ser uno de los definidos', async () => {
    const { fields } = await run(UpdateUserDto, { role: 'SUPERADMIN' });
    expect(fields).toContain('role');
  });

  it('un id con operadores de Prisma/Mongo ({"not": …}) no pasa', async () => {
    const { fields } = await run(CreateCaseDto, { title: 'Caso', clientId: { not: 'x' } });
    expect(fields).toContain('clientId');
  });
});

describe('Ids, fechas y números', () => {
  it('ids absurdos en cuerpo y query', async () => {
    expect((await run(CreateTaskDto, { title: 'Plazo', dueAt: '2026-10-15T18:00:00Z', caseId: 'x'.repeat(65) })).fields).toContain('caseId');
    expect((await run(ListTasksQueryDto, { caseId: '../../' })).fields).toContain('caseId');
    expect((await run(ListAppointmentsQueryDto, { lawyerId: 'a b' })).fields).toContain('lawyerId');
  });

  it('assigneeId "" significa sin responsable', async () => {
    const { dto, errors } = await run(CreateTaskDto, { title: 'Plazo', dueAt: '2026-10-15T18:00:00Z', assigneeId: '' });
    expect(errors).toHaveLength(0);
    expect(dto.assigneeId).toBeNull();
  });

  it('fechas que no existen o fuera de rango', async () => {
    expect((await run(CreateHolidayDto, { date: '2026-02-30', name: 'Feriado' })).fields).toContain('date');
    expect((await run(TermDeadlineQueryDto, { notifiedOn: '1900-01-01', days: '3' })).fields).toContain('notifiedOn');
    expect((await run(CreateTaskDto, { title: 'Plazo', dueAt: '+275760-09-13T00:00:00.000Z' })).fields).toContain('dueAt');
    expect(
      (await run(CreateTaskDto, { title: 'Plazo', termDays: 3, notifiedOn: '2026-13-01' })).fields,
    ).toContain('notifiedOn');
    expect((await run(CreateAppointmentDto, { startsAt: '9999-12-31T00:00:00Z' })).fields).toContain('startsAt');
  });

  it('un término válido no exige dueAt', async () => {
    const { errors } = await run(CreateTaskDto, { title: 'Contestar', termDays: '3', notifiedOn: '2026-10-08' });
    expect(errors).toHaveLength(0);
  });

  it('paginación acotada', async () => {
    expect((await run(PaginationQueryDto, { page: '10001' })).fields).toContain('page');
    expect((await run(PaginationQueryDto, { pageSize: '101' })).fields).toContain('pageSize');
    expect((await run(PaginationQueryDto, { page: '0' })).fields).toContain('page');
    expect((await run(PaginationQueryDto, { page: '1.5' })).fields).toContain('page');
    expect((await run(ListCasesQueryDto, { page: '99999999' })).fields).toContain('page');
  });

  it('los mensajes conservan su tamaño de página por defecto (50)', async () => {
    const { dto } = await run(ListMessagesQueryDto, {});
    expect(dto.pageSize).toBe(50);
    expect(dto.page).toBe(1);
  });
});

describe('Usuarios y firma', () => {
  it('contraseña temporal: mínimo 8 y máximo 72 (como en auth)', async () => {
    const base = { email: 'ana@firma.ec', name: 'Ana', role: 'ABOGADO' };
    expect((await run(CreateUserDto, { ...base, password: '1234567' })).fields).toContain('password');
    expect((await run(CreateUserDto, { ...base, password: 'x'.repeat(73) })).fields).toContain('password');
    expect((await run(CreateUserDto, { ...base, password: '12345678' })).errors).toHaveLength(0);
    expect((await run(UpdateUserDto, { password: 'corta' })).fields).toContain('password');
  });

  it('el email se normaliza', async () => {
    const { dto } = await run(CreateUserDto, { email: '  ANA@Firma.EC ', name: 'Ana', role: 'ABOGADO' });
    expect(dto.email).toBe('ana@firma.ec');
  });

  it('el código de firma no se cambia por PATCH (está en invitaciones y enlaces de acceso)', async () => {
    expect((await run(UpdateTenantDto, { slug: 'otra-firma' })).fields).toContain('slug');
  });

  it('un objeto no pasa como texto ni «false» como verdadero', async () => {
    expect((await run(UpdateCaseDto, { title: { a: 1 } })).fields).toContain('title');
    expect((await run(UpdateCaseDto, { title: ['Demanda'] })).fields).toContain('title');
    const { dto, errors } = await run(LoginDto, { tenantSlug: 'firma-demo', email: 'a@b.ec', password: 'x', remember: 'false' });
    expect(errors).toHaveLength(0);
    expect(dto.remember).toBe(false);
  });

  it('null en un campo que no admite vacío: 400 claro, no un 500', async () => {
    for (const [cls, body, field] of [
      [UpdateTenantDto, { name: null }, 'name'],
      [UpdateTenantDto, { requireTwoFactor: null }, 'requireTwoFactor'],
      [UpdateCaseDto, { title: null }, 'title'],
      [UpdateCaseDto, { status: null }, 'status'],
      [UpdateTaskDto, { dueAt: null }, 'dueAt'],
      [UpdateTaskDto, { done: null }, 'done'],
      [UpdateUserDto, { active: null }, 'active'],
    ] as const) {
      const { errors } = await run(cls as never, body);
      const err = errors.find((e) => e.property === field);
      expect(err?.constraints?.notNull).toMatch(/no puede quedar sin valor/);
    }
    // Omitirlo sigue siendo válido
    expect((await run(UpdateTaskDto, {})).errors).toHaveLength(0);
  });

  it('requireTwoFactor solo booleano', async () => {
    expect((await run(UpdateTenantDto, { requireTwoFactor: 'sí' })).fields).toContain('requireTwoFactor');
  });
});
