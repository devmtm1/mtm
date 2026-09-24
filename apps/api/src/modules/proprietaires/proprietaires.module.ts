import { Module } from '@nestjs/common';
import { ClientAccountsModule } from '../client-accounts/client-accounts.module';
import { AuditModule } from '../audit/audit.module';
import { ProprietairesController } from './proprietaires.controller';
import { ProprietairesService } from './proprietaires.service';

@Module({
  imports: [AuditModule, ClientAccountsModule],
  controllers: [ProprietairesController],
  providers: [ProprietairesService],
  exports: [ProprietairesService],
})
export class ProprietairesModule {}
