import { ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TermsService } from '../terms/terms.service';
import { escapeHtml } from '../common/utils/html';
import { FIRM_SLUG, RegisterFirmDto } from './dto/register-firm.dto';

/** Códigos que podrían confundirse con rutas o con la propia plataforma. */
export const RESERVED_SLUGS = new Set([
  'admin', 'administrador', 'api', 'app', 'www', 'web', 'mail', 'login', 'registro', 'portal', 'cuenta',
  'soporte', 'ayuda', 'help', 'support', 'bogados', 'sistema', 'root', 'test', 'demo',
]);

export function buildWelcomeEmail(d: { name: string; firmName: string; slug: string; loginUrl: string }) {
  const steps = [
    'Invita a tu equipo desde Usuarios.',
    'Revisa los feriados: ya cargamos los nacionales de Ecuador; añade los locales y los traslados.',
    'Activa la verificación en dos pasos en Seguridad de la cuenta.',
  ];
  const text = [
    `Hola ${d.name},`,
    '',
    `${d.firmName} ya tiene su despacho en Bogados. Eres su administrador.`,
    '',
    `Código de firma: ${d.slug}`,
    'Lo necesitáis tú y tu equipo para iniciar sesión.',
    '',
    'Primeros pasos:',
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `Entrar: ${d.loginUrl}`,
  ].join('\n');
  const html = `
    <p>Hola ${escapeHtml(d.name)},</p>
    <p><strong>${escapeHtml(d.firmName)}</strong> ya tiene su despacho en Bogados. Eres su administrador.</p>
    <div style="margin:18px 0;padding:14px 18px;border:1px solid #e1dccf;background:#f4efe4;border-radius:10px">
      <p style="margin:0;color:#555;font-size:13px">Código de firma</p>
      <p style="margin:4px 0 0;font-size:22px;font-weight:600;font-family:ui-monospace,Menlo,Consolas,monospace;color:#1f3d38">${escapeHtml(d.slug)}</p>
      <p style="margin:6px 0 0;color:#555;font-size:13px">Lo necesitáis tú y tu equipo para iniciar sesión.</p>
    </div>
    <p style="margin-bottom:4px"><strong>Primeros pasos</strong></p>
    <ol style="margin-top:0;padding-left:20px;color:#333">${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
    <p><a href="${escapeHtml(d.loginUrl)}" style="display:inline-block;padding:10px 18px;background:#1f3d38;color:#fff;border-radius:8px;text-decoration:none">Entrar en Bogados</a></p>
    <p style="color:#888;font-size:12px">Bogados · gestión legal para firmas de Ecuador</p>`;
  return { subject: `Tu despacho ${d.firmName} ya está en Bogados`, text, html };
}

/** Alta de una firma nueva con su primer administrador. */
@Injectable()
export class FirmSignupService {
  private readonly logger = new Logger('FirmSignup');
  private readonly enabled: boolean;
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private terms: TermsService,
    config: ConfigService,
  ) {
    this.enabled = config.get<boolean>('signup.enabled', true);
    this.appUrl = config.get<string>('appUrl', 'http://localhost:3000');
  }

  /** Para la comprobación en vivo del formulario: libre, o qué alternativa usar. */
  async checkSlug(raw: string) {
    const slug = (raw ?? '').trim().toLowerCase();
    if (!FIRM_SLUG.test(slug)) return { slug, available: false, reason: 'invalid' as const };
    if (await this.isTaken(slug)) {
      return { slug, available: false, reason: 'taken' as const, suggestion: await this.suggest(slug) };
    }
    return { slug, available: true };
  }

  async register(dto: RegisterFirmDto) {
    if (!this.enabled) {
      throw new ForbiddenException('El registro de nuevas firmas está cerrado por ahora. Escríbenos y te damos acceso.');
    }
    if (await this.isTaken(dto.slug)) await this.slugTaken(dto.slug);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    let tenant: { id: string; name: string; slug: string };
    try {
      tenant = await this.prisma.$transaction(async (tx) => {
        const t = await tx.tenant.create({
          data: { name: dto.firmName, slug: dto.slug },
          select: { id: true, name: true, slug: true },
        });
        await tx.user.create({
          data: { tenantId: t.id, email: dto.email, name: dto.name, role: Role.ADMIN, passwordHash, active: true },
        });
        return t;
      });
    } catch (e) {
      // Otra alta se llevó el mismo código entre la comprobación y la creación
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') await this.slugTaken(dto.slug);
      throw e;
    }

    // Los términos necesitan los feriados desde el primer día: este año y el siguiente
    const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric' }).format(new Date()));
    // Nada de lo que sigue deshace el alta: si falla, queda en el log y la firma ya existe
    for (const y of [year, year + 1]) {
      try {
        await this.terms.loadNationalHolidays(tenant.id, y);
      } catch (err) {
        this.logger.error(`No se cargaron los feriados ${y} de ${tenant.slug}`, err instanceof Error ? err.stack : String(err));
      }
    }

    const loginUrl = `${this.appUrl}/login?${new URLSearchParams({ firma: tenant.slug, email: dto.email })}`;
    try {
      await this.mail.send({
        to: dto.email,
        ...buildWelcomeEmail({ name: dto.name, firmName: tenant.name, slug: tenant.slug, loginUrl }),
      });
    } catch (err) {
      this.logger.error(`No se envió la bienvenida a ${dto.email}`, err instanceof Error ? err.stack : String(err));
    }

    return { firm: { name: tenant.name, slug: tenant.slug }, email: dto.email };
  }

  private async isTaken(slug: string) {
    if (RESERVED_SLUGS.has(slug)) return true;
    return Boolean(await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } }));
  }

  /** «estudio-mejia» ocupado → «estudio-mejia-2», «-3»… */
  private async suggest(slug: string): Promise<string | undefined> {
    const base = slug.slice(0, 36).replace(/-+$/, '');
    for (let i = 2; i <= 30; i++) {
      const candidate = `${base}-${i}`;
      if (!(await this.isTaken(candidate))) return candidate;
    }
    return undefined;
  }

  private async slugTaken(slug: string): Promise<never> {
    throw new ConflictException({
      message: 'Ese código de firma ya está en uso. Elige otro.',
      error: { code: 'SLUG_TAKEN', suggestion: await this.suggest(slug) },
    });
  }
}
