import { Module } from '@nestjs/common';
import { ClientAccountsService } from './client-accounts.service';

/** Ouverture des comptes d'espace client, partagée par les modules métier. */
@Module({
  providers: [ClientAccountsService],
  exports: [ClientAccountsService],
})
export class ClientAccountsModule {}
