import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: false,
      });
    }
    return { status: 'ready', database: true };
  }
}
