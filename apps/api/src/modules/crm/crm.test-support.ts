import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { createCloudinaryMock } from '../../../test/helpers/cloudinary-mock';
import { CrmService } from './crm.service';
import { CrmAccessService } from './crm-access.service';
import { CrmOptionsService } from './crm-options.service';
import { CrmActivitesService } from './crm-activites.service';
import { CrmDocumentsService } from './crm-documents.service';
import { CrmReportingService } from './crm-reporting.service';

/** Construit le module CRM complet sur des doublures partagées, pour les specs. */
export function createCrmTestContext() {
  const prismaMock = createPrismaMock();
  const cloudinaryMock = createCloudinaryMock('mtm/crm/p1/documents/doc1');
  const prisma = prismaMock as unknown as PrismaService;
  const cloudinary = cloudinaryMock as unknown as CloudinaryService;
  // Les référentiels lisent la même table SystemSetting que le reste du module.
  const settings = new SettingsService(prisma);
  const access = new CrmAccessService(prisma);
  const options = new CrmOptionsService(settings);

  return {
    prismaMock,
    cloudinaryMock,
    access,
    options,
    service: new CrmService(prisma, access, options),
    activites: new CrmActivitesService(prisma, access, options),
    documents: new CrmDocumentsService(prisma, cloudinary, access, options),
    reporting: new CrmReportingService(prisma, access),
  };
}
