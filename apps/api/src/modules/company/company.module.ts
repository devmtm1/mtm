import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { CompanyController } from './company.controller';
import { CompanyProfileService } from './company-profile.service';

/**
 * Identité de l'entreprise pour les documents générés. Globale : les ventes, les
 * démarches, la gestion locative et la construction impriment toutes le même
 * en-tête et le même pied de page.
 */
@Global()
@Module({
  imports: [AuditModule],
  controllers: [CompanyController],
  providers: [CompanyProfileService, CloudinaryService],
  exports: [CompanyProfileService],
})
export class CompanyModule {}
