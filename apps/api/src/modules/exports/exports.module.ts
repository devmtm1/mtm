import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { RecusClientController } from './recus-client.controller';
import { RecusClientService } from './recus-client.service';

/** Exports Excel et PDF des listes du back-office. */
@Module({
  imports: [AuditModule],
  controllers: [ExportsController, RecusClientController],
  providers: [ExportsService, RecusClientService],
})
export class ExportsModule {}
