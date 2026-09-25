import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { CasesModule } from './cases/cases.module';
import { NotesModule } from './notes/notes.module';
import { DocumentsModule } from './documents/documents.module';
import { MessagesModule } from './messages/messages.module';
import { ActivityModule } from './activity/activity.module';
import { ClientsModule } from './clients/clients.module';
import { StorageModule } from './storage/storage.module';

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
    NotesModule,
    DocumentsModule,
    MessagesModule,
    ActivityModule,
    ClientsModule,
  ],
})
export class AppModule {}
