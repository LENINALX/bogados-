import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { LoginDto } from './auth/dto/login.dto';
import { translateValidationMessage, validationExceptionFactory } from './validation-messages';

describe('translateValidationMessage', () => {
  it.each([
    ['password', 'password must be shorter than or equal to 72 characters', 'La contraseña no puede tener más de 72 caracteres'],
    ['role', 'property role should not exist', 'No se admite el rol'],
    ['xyz', 'property xyz should not exist', 'No se admite «xyz»'],
    ['pageSize', 'pageSize must not be greater than 100', 'El tamaño de página no puede ser mayor que 100'],
    ['fooBar', 'fooBar must be a string', '«fooBar» debe ser texto'],
  ])('%s: %s', (prop, msg, expected) => {
    expect(translateValidationMessage(prop, msg)).toBe(expected);
  });

  it('los mensajes propios en español no se tocan', () => {
    expect(translateValidationMessage('email', 'Escribe un email válido')).toBe('Escribe un email válido');
  });
});

describe('ValidationPipe con los mensajes en español', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: validationExceptionFactory,
  });

  it('responde 400 con los mensajes traducidos', async () => {
    const err = await pipe
      .transform(
        { email: 'a@b.ec', password: 'x'.repeat(80), tenantSlug: 'firma-demo', role: 'ADMIN' },
        { type: 'body', metatype: LoginDto },
      )
      .catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const messages = (err.getResponse() as { message: string[] }).message;
    expect(messages).toEqual(
      expect.arrayContaining(['La contraseña no puede tener más de 72 caracteres', 'No se admite el rol']),
    );
    expect(messages.join(' ')).not.toMatch(/must|should/);
  });
});
