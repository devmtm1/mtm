import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incident.dto';

const include = {
  reportedBy: { select: { id: true, firstName: true, lastName: true } },
};

/**
 * Incidents et demandes d'un bail (sections 4 et 15 : l'espace locataire
 * couvre « incidents **et demandes** »). Les deux suivent le même cycle et se
 * distinguent par leur nature : un incident constaté par MTM en visite se
 * saisit ici comme un signalement du locataire depuis son espace.
 */
@Injectable()
export class IncidentsLocatifService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(bailLocatifId: string, user: LocatifUser, nature?: string) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const where: Prisma.IncidentLocatifWhereInput = {
      bailLocatifId,
      ...(nature ? { nature } : {}),
    };
    return this.prisma.incidentLocatif.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    bailLocatifId: string,
    dto: CreateIncidentDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    return this.creerSignalement(bailLocatifId, dto, user.id);
  }

  /**
   * Création d'un signalement. Utilisée par le back-office (après contrôle du
   * périmètre) et par l'espace locataire (après vérification que le bail est
   * bien le sien) : une seule règle de validation pour les deux entrées.
   */
  async creerSignalement(
    bailLocatifId: string,
    dto: CreateIncidentDto,
    reportedById: string | null,
  ) {
    const nature = dto.nature ?? 'incident';
    await this.options.assertTypeSignalement(nature, dto.type);
    return this.prisma.incidentLocatif.create({
      data: {
        bailLocatifId,
        nature,
        type: dto.type,
        description: dto.description,
        reportedById,
      },
      include,
    });
  }

  async update(
    bailLocatifId: string,
    incidentId: string,
    dto: UpdateIncidentDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    await this.options.assertStatutIncident(dto.statut);
    const existant = await this.prisma.incidentLocatif.findFirst({
      where: { id: incidentId, bailLocatifId },
      select: { id: true, statut: true, resolutionNotes: true, nature: true },
    });
    if (!existant) throw new NotFoundException('Signalement introuvable');
    const miAJour = await this.prisma.incidentLocatif.update({
      where: { id: incidentId },
      data: {
        ...(dto.statut !== undefined
          ? {
              statut: dto.statut,
              resolvedAt: dto.statut === 'resolu' ? new Date() : null,
            }
          : {}),
        ...(dto.resolutionNotes !== undefined
          ? { resolutionNotes: dto.resolutionNotes }
          : {}),
      },
      include,
    });
    await this.notifierMiseAJour(bailLocatifId, existant, dto);
    return miAJour;
  }

  /**
   * Prévient le locataire quand son signalement ou sa demande change d'état, ou
   * reçoit une réponse : c'est ce qu'il attend d'une demande déposée depuis son
   * espace.
   */
  private async notifierMiseAJour(
    bailLocatifId: string,
    avant: {
      id: string;
      statut: string;
      resolutionNotes: string | null;
      nature: string;
    },
    dto: UpdateIncidentDto,
  ): Promise<void> {
    const statutChange =
      dto.statut !== undefined && dto.statut !== avant.statut;
    const reponse = dto.resolutionNotes?.trim();
    const reponseNouvelle =
      !!reponse && reponse !== (avant.resolutionNotes ?? '').trim();
    if (!statutChange && !reponseNouvelle) return;

    const bail = await this.prisma.bailLocatif.findUnique({
      where: { id: bailLocatifId },
      select: { locataireId: true },
    });
    if (!bail?.locataireId) return;
    const objet = avant.nature === 'demande' ? 'demande' : 'signalement';
    await this.notifications.notifierClient(
      { locataireId: bail.locataireId },
      {
        type: 'incident_maj',
        titre: reponseNouvelle
          ? `MTM a répondu à votre ${objet}`
          : dto.statut === 'resolu'
            ? `Votre ${objet} est résolu${objet === 'demande' ? 'e' : ''}`
            : `Votre ${objet} est mis${objet === 'demande' ? 'e' : ''} à jour`,
        message: reponseNouvelle ? reponse.slice(0, 200) : undefined,
        lien: '/espace-client/ma-location',
        entityType: 'IncidentLocatif',
        entityId: avant.id,
        dedupeKey: `incident-maj:${avant.id}:${Date.now()}`,
      },
    );
  }
}
