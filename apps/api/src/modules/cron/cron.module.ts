import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { RappelsClientService } from './rappels-client.service';
import { PrismaModule } from '../../database/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuditModule],
  providers: [CronService, RappelsClientService],
  exports: [CronService, RappelsClientService],
})
export class CronModule {}
