import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ProprietairesController } from './proprietaires.controller';
import { ProprietairesService } from './proprietaires.service';

@Module({
  imports: [AuditModule],
  controllers: [ProprietairesController],
  providers: [ProprietairesService],
  exports: [ProprietairesService],
})
export class ProprietairesModule {}
