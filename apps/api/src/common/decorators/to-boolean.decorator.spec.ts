import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListTasksQueryDto } from '../../tasks/dto/task.dto';
import { ListNotificationsQueryDto } from '../../notifications/dto/notification.dto';

// Mismas opciones que el ValidationPipe global de main.ts
function parse<T extends object>(cls: new () => T, query: Record<string, string>) {
  const dto = plainToInstance(cls, query, { enableImplicitConversion: true });
  return { dto, errors: validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }) };
}

describe('ToBoolean en query DTOs', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['1', true],
    ['0', false],
  ])('ListTasksQueryDto done=%s → %s', (raw, expected) => {
    const { dto, errors } = parse(ListTasksQueryDto, { done: raw, overdue: raw });
    expect(errors).toHaveLength(0);
    expect(dto.done).toBe(expected);
    expect(dto.overdue).toBe(expected);
  });

  it('ListNotificationsQueryDto unreadOnly=false → false', () => {
    const { dto, errors } = parse(ListNotificationsQueryDto, { unreadOnly: 'false' });
    expect(errors).toHaveLength(0);
    expect(dto.unreadOnly).toBe(false);
  });

  it('ListNotificationsQueryDto unreadOnly=true → true', () => {
    const { dto } = parse(ListNotificationsQueryDto, { unreadOnly: 'true' });
    expect(dto.unreadOnly).toBe(true);
  });

  it('parámetro ausente queda undefined', () => {
    const { dto, errors } = parse(ListTasksQueryDto, {});
    expect(errors).toHaveLength(0);
    expect(dto.done).toBeUndefined();
  });

  it('valor no booleano se rechaza', () => {
    const { errors } = parse(ListTasksQueryDto, { done: 'quizas' });
    expect(errors.map((e) => e.property)).toContain('done');
  });
});
