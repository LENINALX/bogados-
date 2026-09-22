import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness — proceso en pie' })
  live() {
    return { status: 'ok', service: 'bogados-api', ts: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — DB conectada' })
  async ready() {
    const db = await this.prisma.isReady();
    if (!db) {
      return { status: 'not_ready', database: false };
    }
    return { status: 'ready', database: true };
  }
}
