import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { ClientAccountsService } from '../client-accounts/client-accounts.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { createCloudinaryMock } from '../../../test/helpers/cloudinary-mock';
import { LocatifAccessService } from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import { BiensService } from './biens.service';
import { BauxService } from './baux.service';
import { PaiementsLoyerService } from './paiements.service';
import { CautionService } from './caution.service';
import { IncidentsLocatifService } from './incidents.service';
import { DocumentsLocatifService } from './documents.service';
import { RelancesLoyerService } from './relances.service';
import { LocatifSchedulerService } from './locatif-scheduler.service';
import { LocatairesService } from './locataires.service';

/** Monte le module gestion locative sur des doublures partagées, pour les specs. */
export function createLocatifTestContext() {
  const prismaMock = createPrismaMock();
  const cloudinaryMock = createCloudinaryMock('locatif/b1/document', 'raw');
  const prisma = prismaMock as unknown as PrismaService;
  const cloudinary = cloudinaryMock as unknown as CloudinaryService;
  // Table de paramètres vide : les listes par défaut du code s'appliquent.
  prismaMock.systemSetting.findUnique.mockResolvedValue(null);
  const settings = new SettingsService(prisma);
  const access = new LocatifAccessService(prisma);
  const options = new LocatifOptionsService(settings);
  const configMock = { get: jest.fn() };
  const mailMock = { send: jest.fn().mockResolvedValue(true) };
  const auditMock = { record: jest.fn().mockResolvedValue(undefined) };
  const comptesClient = new ClientAccountsService(
    prisma,
    configMock as never,
    mailMock as never,
  );
  const relances = new RelancesLoyerService(
    prisma,
    access,
    options,
    mailMock as never,
  );
  const incidents = new IncidentsLocatifService(prisma, access, options);

  return {
    prismaMock,
    cloudinaryMock,
    configMock,
    mailMock,
    auditMock,
    access,
    options,
    biens: new BiensService(prisma, access, options),
    baux: new BauxService(prisma, access, options),
    paiements: new PaiementsLoyerService(prisma, access, options),
    caution: new CautionService(prisma, access, options),
    incidents,
    documents: new DocumentsLocatifService(prisma, cloudinary, access, options),
    relances,
    scheduler: new LocatifSchedulerService(
      prisma,
      auditMock as never,
      options,
      relances,
    ),
    locataires: new LocatairesService(prisma, comptesClient),
  };
}
