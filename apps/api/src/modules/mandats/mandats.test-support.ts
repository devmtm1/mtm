import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { createCloudinaryMock } from '../../../test/helpers/cloudinary-mock';
import { MandatsService } from './mandats.service';
import { MandatsAccessService } from './mandats-access.service';
import { MandatsFinanceService } from './mandats-finance.service';
import { MandatsAlertesService } from './mandats-alertes.service';
import { MandatsLotsService } from './mandats-lots.service';
import { MandatsDocumentsService } from './mandats-documents.service';

/** Construit le module mandats complet sur des doublures partagées, pour les specs. */
export function createMandatsTestContext() {
  const prismaMock = createPrismaMock();
  const cloudinaryMock = createCloudinaryMock('mtm/mandats/m1/documents/doc1');
  const prisma = prismaMock as unknown as PrismaService;
  const cloudinary = cloudinaryMock as unknown as CloudinaryService;
  const settings = new SettingsService(prisma);
  const access = new MandatsAccessService(prisma);

  return {
    prismaMock,
    cloudinaryMock,
    access,
    service: new MandatsService(prisma, cloudinary, settings, access),
    finance: new MandatsFinanceService(prisma, settings, access),
    alertes: new MandatsAlertesService(prisma, access),
    lots: new MandatsLotsService(prisma, access),
    documents: new MandatsDocumentsService(
      prisma,
      cloudinary,
      settings,
      access,
    ),
  };
}
