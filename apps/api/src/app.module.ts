import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { CasesModule } from './cases/cases.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env', 'apps/api/.env'],
    }),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CasesModule,
  ],
})
export class AppModule {}
