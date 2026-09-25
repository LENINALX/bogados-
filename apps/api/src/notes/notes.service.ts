import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { getAccessibleCase } from '../common/utils/case-access';
import { isStaff } from '../common/utils/permissions';
import { ActivityService } from '../activity/activity.service';
import { CreateNoteDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private activity: ActivityService,
  ) {}

  async list(caseId: string, user: JwtPayloadUser) {
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const where: { caseId: string; tenantId: string; isInternal?: boolean } = {
      caseId: c.id,
      tenantId: user.tenantId,
    };
    if (!isStaff(user.role)) {
      where.isInternal = false;
    }
    return this.prisma.caseNote.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(caseId: string, dto: CreateNoteDto, user: JwtPayloadUser) {
    if (!isStaff(user.role)) {
      throw new ForbiddenException('Los clientes no pueden crear notas internas');
    }
    const c = await getAccessibleCase(this.prisma, caseId, user);
    const note = await this.prisma.caseNote.create({
      data: {
        tenantId: user.tenantId,
        caseId: c.id,
        authorId: user.id,
        body: dto.body,
        isInternal: dto.isInternal ?? true,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    await this.activity.log({
      tenantId: user.tenantId,
      caseId: c.id,
      actorId: user.id,
      type: 'NOTE_ADDED',
      summary: note.isInternal ? 'Nota interna agregada' : 'Nota visible al cliente',
      meta: { noteId: note.id, isInternal: note.isInternal },
    });

    return note;
  }
}
