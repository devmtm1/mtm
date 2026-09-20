import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CrmAccessService, type CrmUser } from './crm-access.service';
import { CrmOptionsService, CRM_DEFAULTS } from './crm-options.service';
import type {
  CreateVisiteProspectDto,
  UpdateVisiteProspectDto,
} from './dto/visite-prospect.dto';

const visiteInclude = {
  terrain: {
    select: {
      id: true,
      referenceInterne: true,
      nom: true,
      region: true,
      commune: true,
      superficie: true,
      prixPublic: true,
      statutJuridique: true,
      statutCommercial: true,
    },
  },
  accompagnateur: { select: { id: true, firstName: true, lastName: true } },
} as const;

/**
 * Propositions de terrains faites à un prospect : chaque ligne porte le
 * rendez-vous de visite et le retour du client (fiche de suivi § 3 à 5).
 * C'est aussi l'historique des terrains déjà montrés, pour ne pas reproposer
 * deux fois le même.
 */
@Injectable()
export class CrmVisitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CrmAccessService,
    private readonly options: CrmOptionsService,
  ) {}

  async findAll(prospectId: string, user: CrmUser) {
    await this.access.assertOwnership(prospectId, user);
    await this.access.ensureExists(prospectId);
    return this.prisma.visiteProspect.findMany({
      where: { prospectId },
      orderBy: [{ createdAt: 'desc' }],
      include: visiteInclude,
    });
  }

  /** Visites à venir (agenda du commercial ou de l'équipe). */
  async getUpcoming(user: CrmUser, limit = 20) {
    const isManager = this.access.isManager(user);
    return this.prisma.visiteProspect.findMany({
      where: {
        statut: { in: ['proposee', 'programmee'] },
        dateConfirmee: { gte: new Date() },
        prospect: isManager ? undefined : { commercialResponsableId: user.id },
      },
      orderBy: { dateConfirmee: 'asc' },
      take: limit,
      include: {
        ...visiteInclude,
        prospect: {
          select: {
            id: true,
            referenceInterne: true,
            nom: true,
            prenom: true,
            telephone: true,
            commercialResponsableId: true,
          },
        },
      },
    });
  }

  async create(
    prospectId: string,
    dto: CreateVisiteProspectDto,
    user: CrmUser,
  ) {
    await this.access.assertOwnership(prospectId, user);
    await this.access.ensureExists(prospectId);
    await this.assertTerrain(dto.terrainId);
    await this.assertReferentials(dto);

    const statut = dto.statut ?? this.inferStatut(dto);
    return this.prisma.visiteProspect.create({
      data: {
        prospectId,
        terrainId: dto.terrainId,
        statut,
        ...this.toData(dto),
        createdById: user.id,
      },
      include: visiteInclude,
    });
  }

  async update(
    prospectId: string,
    visiteId: string,
    dto: UpdateVisiteProspectDto,
    user: CrmUser,
  ) {
    await this.access.assertOwnership(prospectId, user);
    const existing = await this.prisma.visiteProspect.findFirst({
      where: { id: visiteId, prospectId },
    });
    if (!existing) throw new NotFoundException('Visite introuvable');
    if (dto.terrainId) await this.assertTerrain(dto.terrainId);
    await this.assertReferentials(dto);

    return this.prisma.visiteProspect.update({
      where: { id: visiteId },
      data: {
        ...(dto.terrainId ? { terrainId: dto.terrainId } : {}),
        statut: dto.statut ?? this.inferStatut(dto, existing.statut),
        ...this.toData(dto),
      },
      include: visiteInclude,
    });
  }

  async remove(prospectId: string, visiteId: string, user: CrmUser) {
    await this.access.assertOwnership(prospectId, user);
    const existing = await this.prisma.visiteProspect.findFirst({
      where: { id: visiteId, prospectId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Visite introuvable');
    await this.prisma.visiteProspect.delete({ where: { id: visiteId } });
  }

  /**
   * Un retour saisi vaut visite effectuée ; une date confirmée vaut visite
   * programmée. Le commercial n'a donc pas à gérer le statut à la main, y
   * compris lorsqu'il complète une visite déjà enregistrée.
   */
  private inferStatut(
    dto: CreateVisiteProspectDto | UpdateVisiteProspectDto,
    actuel = 'proposee',
  ): string {
    if (dto.dateRetour || dto.terrainPlait) return 'effectuee';
    if (dto.motifNonEffectuee) return 'annulee';
    if (dto.dateConfirmee) return 'programmee';
    return actuel;
  }

  private async assertTerrain(terrainId: string): Promise<void> {
    const terrain = await this.prisma.terrain.findUnique({
      where: { id: terrainId },
      select: { id: true },
    });
    if (!terrain) throw new BadRequestException('Terrain introuvable');
  }

  private async assertReferentials(
    dto: CreateVisiteProspectDto | UpdateVisiteProspectDto,
  ): Promise<void> {
    if (dto.statut && !CRM_DEFAULTS.statutsVisite.includes(dto.statut as never))
      throw new BadRequestException('Statut de visite invalide');
    if (
      dto.motifNonEffectuee &&
      !CRM_DEFAULTS.motifsNonVisite.includes(dto.motifNonEffectuee as never)
    )
      throw new BadRequestException('Motif de visite non effectuée invalide');
    if (
      dto.terrainPlait &&
      !CRM_DEFAULTS.appreciationsTerrain.includes(dto.terrainPlait as never)
    )
      throw new BadRequestException('Appréciation du terrain invalide');
    if (
      dto.prixAccepte &&
      !CRM_DEFAULTS.prixAccepte.includes(dto.prixAccepte as never)
    )
      throw new BadRequestException('Valeur « prix accepté » invalide');
    if (dto.objectionPrincipale)
      await this.options.assertObjection(dto.objectionPrincipale);
  }

  private toData(dto: CreateVisiteProspectDto | UpdateVisiteProspectDto) {
    const date = (value?: string) => (value ? new Date(value) : undefined);
    return {
      ...(dto.dateProposee !== undefined
        ? { dateProposee: date(dto.dateProposee) }
        : {}),
      ...(dto.dateConfirmee !== undefined
        ? { dateConfirmee: date(dto.dateConfirmee) }
        : {}),
      ...(dto.heure !== undefined ? { heure: dto.heure } : {}),
      ...(dto.lieuRendezVous !== undefined
        ? { lieuRendezVous: dto.lieuRendezVous }
        : {}),
      ...(dto.fraisVisite !== undefined
        ? { fraisVisite: dto.fraisVisite }
        : {}),
      ...(dto.fraisPayes !== undefined ? { fraisPayes: dto.fraisPayes } : {}),
      ...(dto.accompagnateurId !== undefined
        ? { accompagnateurId: dto.accompagnateurId }
        : {}),
      ...(dto.motifNonEffectuee !== undefined
        ? { motifNonEffectuee: dto.motifNonEffectuee }
        : {}),
      ...(dto.dateRetour !== undefined
        ? { dateRetour: date(dto.dateRetour) }
        : {}),
      ...(dto.terrainPlait !== undefined
        ? { terrainPlait: dto.terrainPlait }
        : {}),
      ...(dto.prixAccepte !== undefined
        ? { prixAccepte: dto.prixAccepte }
        : {}),
      ...(dto.objectionPrincipale !== undefined
        ? { objectionPrincipale: dto.objectionPrincipale }
        : {}),
      ...(dto.commentaireClient !== undefined
        ? { commentaireClient: dto.commentaireClient }
        : {}),
      ...(dto.souhaiteAutreTerrain !== undefined
        ? { souhaiteAutreTerrain: dto.souhaiteAutreTerrain }
        : {}),
    };
  }
}
