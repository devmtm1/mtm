import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { InternalNotificationService } from '../../common/mail/internal-notification.service';
import { createPrismaMock } from '../../../test/helpers/prisma-mock';
import { NotificationsService } from '../notifications/notifications.service';
import { VentesService } from './ventes.service';
import { VentesAccessService } from './ventes-access.service';
import { VentesWorkflowService } from './ventes-workflow.service';
import { VentesDocumentsService } from './ventes-documents.service';
import { VentesPaiementsService } from './ventes-paiements.service';
import { VentesCommissionsService } from './ventes-commissions.service';

/** Construit le module ventes complet sur des doublures partagées, pour les specs. */
export function createVentesTestContext() {
  const prismaMock = createPrismaMock();
  const cloudinaryMock = {
    upload: jest.fn().mockResolvedValue({
      publicId: 'ventes/d1/generated/bon_reservation',
      resourceType: 'raw',
    }),
    destroy: jest.fn(),
    url: jest.fn().mockReturnValue('https://example.com/document.pdf'),
  };
  const notificationsMock = { notify: jest.fn().mockResolvedValue(undefined) };
  const notifierMock = {
    notifier: jest.fn().mockResolvedValue(1),
    notifierPermission: jest.fn().mockResolvedValue(1),
  };

  const prisma = prismaMock as unknown as PrismaService;
  const cloudinary = cloudinaryMock as unknown as CloudinaryService;
  const access = new VentesAccessService(prisma);
  const settings = new SettingsService(prisma);
  const workflow = new VentesWorkflowService(settings);

  return {
    prismaMock: prismaMock,
    cloudinaryMock,
    notificationsMock,
    notifierMock,
    access,
    workflow,
    service: new VentesService(
      prisma,
      cloudinary,
      access,
      notificationsMock as unknown as InternalNotificationService,
      workflow,
    ),
    paiements: new VentesPaiementsService(
      prisma,
      access,
      workflow,
      notifierMock as unknown as NotificationsService,
    ),
    commissions: new VentesCommissionsService(prisma, access, workflow),
    documents: new VentesDocumentsService(prisma, cloudinary, access, settings),
  };
}
