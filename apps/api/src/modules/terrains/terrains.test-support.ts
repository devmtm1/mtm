import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { createCloudinaryMock } from '../../../test/helpers/cloudinary-mock';
import { TerrainsService } from './terrains.service';
import { TerrainsAccessService } from './terrains-access.service';
import { TerrainsPublicService } from './terrains-public.service';
import { TerrainsAssetsService } from './terrains-assets.service';

/** Construit le module terrains complet sur des doublures partagées, pour les specs. */
export function createTerrainsTestContext() {
  const prismaMock = createPrismaMock();
  const cloudinaryMock = createCloudinaryMock('terrains/t1/image', 'image');
  const prisma = prismaMock as unknown as PrismaService;
  const cloudinary = cloudinaryMock as unknown as CloudinaryService;
  // Table de paramètres vide par défaut : les listes du code s'appliquent.
  prismaMock.systemSetting.findUnique.mockResolvedValue(null);
  const settings = new SettingsService(prisma);
  const access = new TerrainsAccessService(prisma);

  return {
    prismaMock,
    cloudinaryMock,
    access,
    service: new TerrainsService(prisma, cloudinary, settings, access),
    publicCatalog: new TerrainsPublicService(prisma, cloudinary, settings),
    assets: new TerrainsAssetsService(prisma, cloudinary, access),
  };
}
