import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { recordActivity } from '../activity/activity.service';
import { UpdateTenantDto } from './dto/tenant.dto';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { LOGO_MAX_BYTES, sniffLogo } from './branding';

/** Forma de cualquier código de firma guardado (los nuevos siguen FIRM_SLUG, más estricto). */
const PUBLIC_SLUG = /^[a-z0-9-]{1,60}$/;

type TenantSettings = Pick<
  Tenant,
  'name' | 'slug' | 'requireTwoFactor' | 'brandColor' | 'contactEmail' | 'contactPhone' | 'address' | 'website'
>;

/** Qué cambió, en palabras, para el registro de actividad. */
export function describeTenantChanges(before: TenantSettings, after: TenantSettings): string[] {
  const changes: string[] = [];
  if (after.name !== before.name) changes.push(`nombre: ${before.name} → ${after.name}`);
  if (after.slug !== before.slug) changes.push(`código de firma: ${before.slug} → ${after.slug}`);
  if (after.requireTwoFactor !== before.requireTwoFactor) {
    changes.push(`código por email obligatorio para el equipo: ${after.requireTwoFactor ? 'sí' : 'no'}`);
  }
  if ((after.brandColor ?? null) !== (before.brandColor ?? null)) {
    changes.push(`color de marca: ${after.brandColor ?? 'el de Bogados'}`);
  }
  // [campo, etiqueta, terminación según el género: «teléfono actualizado», «dirección actualizada»]
  const contact: [keyof TenantSettings, string, 'o' | 'a'][] = [
    ['contactEmail', 'email de contacto', 'o'],
    ['contactPhone', 'teléfono', 'o'],
    ['address', 'dirección', 'a'],
    ['website', 'web', 'a'],
  ];
  for (const [field, label, g] of contact) {
    if ((after[field] ?? null) !== (before[field] ?? null)) {
      changes.push(`${label} ${after[field] ? `actualizad${g}` : `borrad${g}`}`);
    }
  }
  return changes;
}

/** La firma tal como la ve la web: sin la ruta interna del logo. */
export function presentTenant(t: Tenant) {
  const { logoPath, logoMime: _mime, ...rest } = t;
  return { ...rest, hasLogo: Boolean(logoPath) };
}

/**
 * Todas las operaciones quedan acotadas al tenant del usuario autenticado.
 * No existe (aún) un rol de administrador de plataforma, así que el alta de
 * nuevas firmas no se expone por API.
 */
@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Para la pantalla de acceso: confirma el código de firma y muestra su nombre, su logo y su
   * color. Nada más de la firma: sin sesión, solo lo que ya ve cualquiera que reciba un email suyo.
   */
  async findPublic(slug: string) {
    const clean = this.cleanSlug(slug);
    const t = await this.prisma.tenant.findUnique({
      where: { slug: clean },
      select: { name: true, slug: true, brandColor: true, logoPath: true, logoUpdatedAt: true },
    });
    if (!t) throw new NotFoundException('No encontramos ninguna firma con ese código');
    return {
      name: t.name,
      slug: t.slug,
      brandColor: t.brandColor,
      /** Versión del logo para la URL (caché); null si no tiene */
      logoVersion: t.logoPath && t.logoUpdatedAt ? t.logoUpdatedAt.getTime() : null,
    };
  }

  /** Logo para mostrarlo sin sesión (acceso, emails). */
  async publicLogo(slug: string) {
    const t = await this.prisma.tenant.findUnique({
      where: { slug: this.cleanSlug(slug) },
      select: { logoPath: true, logoMime: true, logoUpdatedAt: true },
    });
    if (!t?.logoPath || !t.logoMime) throw new NotFoundException('Esta firma no tiene logo');
    const buffer = await this.storage.read(t.logoPath).catch(() => {
      throw new NotFoundException('Esta firma no tiene logo');
    });
    return { buffer, mime: t.logoMime, updatedAt: t.logoUpdatedAt };
  }

  async findAll(actor: JwtPayloadUser) {
    const items = await this.prisma.tenant.findMany({ where: { id: actor.tenantId } });
    return items.map(presentTenant);
  }

  async findOne(id: string, actor: JwtPayloadUser) {
    return presentTenant(await this.get(id, actor));
  }

  async update(id: string, dto: UpdateTenantDto, actor: JwtPayloadUser) {
    const before = await this.get(id, actor);
    if (dto.slug) {
      const exists = await this.prisma.tenant.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (exists) throw new ConflictException('Slug ya en uso');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenant.update({ where: { id }, data: dto });
      const changes = describeTenantChanges(before, row);
      if (changes.length) {
        await recordActivity(tx, {
          tenantId: id,
          actorId: actor.id,
          type: 'SETTINGS_UPDATED',
          summary: `Ajustes de la firma: ${changes.join('; ')}`,
        });
      }
      return row;
    });
    return presentTenant(updated);
  }

  /** Sustituye el logo. El tipo se decide por el contenido, no por el nombre ni el tipo declarado. */
  async setLogo(id: string, file: Express.Multer.File | undefined, actor: JwtPayloadUser) {
    const before = await this.get(id, actor);
    if (!file?.buffer?.length) throw new BadRequestException('Elige una imagen para el logo');
    if (file.buffer.length > LOGO_MAX_BYTES) throw new BadRequestException('El logo no puede pasar de 512 KB');
    const mime = sniffLogo(file.buffer);
    if (!mime) throw new BadRequestException('El archivo no es una imagen PNG, JPG o WebP válida');

    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[mime];
    const { storagePath } = await this.storage.save(id, 'marca', `logo.${ext}`, file.buffer);
    let updated: Tenant;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        const row = await tx.tenant.update({
          where: { id },
          data: { logoPath: storagePath, logoMime: mime, logoUpdatedAt: new Date() },
        });
        await recordActivity(tx, {
          tenantId: id,
          actorId: actor.id,
          type: 'SETTINGS_UPDATED',
          summary: before.logoPath ? 'Ajustes de la firma: logo cambiado' : 'Ajustes de la firma: logo añadido',
        });
        return row;
      });
    } catch (err) {
      await this.storage.remove(storagePath);
      throw err;
    }
    if (before.logoPath) await this.storage.remove(before.logoPath);
    return presentTenant(updated);
  }

  async removeLogo(id: string, actor: JwtPayloadUser) {
    const before = await this.get(id, actor);
    if (!before.logoPath) return presentTenant(before);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenant.update({
        where: { id },
        data: { logoPath: null, logoMime: null, logoUpdatedAt: new Date() },
      });
      await recordActivity(tx, {
        tenantId: id,
        actorId: actor.id,
        type: 'SETTINGS_UPDATED',
        summary: 'Ajustes de la firma: logo quitado',
      });
      return row;
    });
    await this.storage.remove(before.logoPath);
    return presentTenant(updated);
  }

  private async get(id: string, actor: JwtPayloadUser) {
    // Otro tenant se trata como inexistente para no revelar ids válidos
    if (id !== actor.tenantId) throw new NotFoundException('Tenant no encontrado');
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant no encontrado');
    return t;
  }

  /** Un código imposible no llega a la base de datos (misma respuesta que uno inexistente). */
  private cleanSlug(slug: string) {
    const clean = typeof slug === 'string' ? slug.toLowerCase().trim() : '';
    if (!PUBLIC_SLUG.test(clean)) throw new NotFoundException('No encontramos ninguna firma con ese código');
    return clean;
  }
}
