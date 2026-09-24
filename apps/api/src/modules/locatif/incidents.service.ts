import { Injectable, NotFoundException } from '@nestjs/common';
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
      select: { id: true },
    });
    if (!existant) throw new NotFoundException('Signalement introuvable');
    return this.prisma.incidentLocatif.update({
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
  }
}
