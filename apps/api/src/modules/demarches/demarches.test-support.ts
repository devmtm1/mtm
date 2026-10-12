import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { createCloudinaryMock } from '../../../test/helpers/cloudinary-mock';
import { DemarchesAccessService } from './demarches-access.service';
import { DemarchesOptionsService } from './demarches-options.service';
import { DemarchesService } from './demarches.service';
import { DemarchesEtapesService } from './demarches-etapes.service';
import { DemarchesDocumentsService } from './demarches-documents.service';
import { CompanyProfileService } from '../company/company-profile.service';
import { DemarchesClientService } from './demarches-client.service';
import { DemarchesPaiementsService } from './demarches-paiements.service';
import { MissionReferencesService } from './mission-references.service';
import { NotificationsService } from '../notifications/notifications.service';

/** Monte le module démarches sur des doublures partagées, pour les specs. */
export function createDemarchesTestContext() {
  const prismaMock = createPrismaMock();
  const cloudinaryMock = createCloudinaryMock('demarches/m1/rapport', 'raw');
  const prisma = prismaMock as unknown as PrismaService;
  const cloudinary = cloudinaryMock as unknown as CloudinaryService;
  // Table de paramètres vide : les listes par défaut du code s'appliquent.
  prismaMock.systemSetting.findUnique.mockResolvedValue(null);
  const settings = new SettingsService(prisma);
  const access = new DemarchesAccessService(prisma);
  const options = new DemarchesOptionsService(settings);
  const references = new MissionReferencesService(prisma, options);
  const notificationsMock = {
    notifierClient: jest.fn().mockResolvedValue(0),
  };

  return {
    prismaMock,
    cloudinaryMock,
    access,
    options,
    missions: new DemarchesService(
      prisma,
      access,
      options,
      cloudinary,
      references,
    ),
    etapes: new DemarchesEtapesService(prisma, access, options),
    documents: new DemarchesDocumentsService(
      prisma,
      cloudinary,
      access,
      options,
      references,
      new CompanyProfileService(prisma, cloudinary),
    ),
    client: new DemarchesClientService(prisma, cloudinary, options),
    references,
    notificationsMock,
    paiements: new DemarchesPaiementsService(
      prisma,
      access,
      options,
      notificationsMock as unknown as NotificationsService,
    ),
  };
}
