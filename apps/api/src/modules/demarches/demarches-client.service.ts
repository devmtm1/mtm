import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { DemarchesOptionsService } from './demarches-options.service';
import type { CreateClientMissionDto } from './dto/mission.dto';

/**
 * Vue client des missions de vérification (section 14 : « le rapport doit
 * être rendu accessible au client depuis son espace sécurisé »).
 *
 * Le client voit l'avancement de sa mission, sa conclusion une fois rendue,
 * et les seules pièces publiées. Jamais un constat interne non publié, jamais
 * le détail de facturation d'une autre mission que la sienne.
 */
@Injectable()
export class DemarchesClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly options: DemarchesOptionsService,
  ) {}

  /**
   * Demande de vérification déposée par le client depuis son espace.
   *
   * Elle arrive comme n'importe quelle mission, à l'étape « demande » et sans
   * responsable : c'est l'équipe qui la prend en charge, la chiffre et
   * l'affecte. Le client ne fixe ni le prix ni le délai.
   */
  async createMission(userId: string, dto: CreateClientMissionDto) {
    const prospectId = await this.prospectDuCompte(userId);
    await Promise.all([
      this.options.assertTypeVerification(dto.typeVerification),
      this.options.assertUrgence(dto.urgence),
    ]);
    if (dto.terrainId) {
      const terrain = await this.prisma.terrain.findUnique({
        where: { id: dto.terrainId },
        select: { id: true },
      });
      if (!terrain) throw new BadRequestException('Terrain introuvable');
    }

    const mission = await this.prisma.missionVerification.create({
      data: {
        referenceInterne: await this.prochaineReference(),
        prospectId,
        terrainId: dto.terrainId ?? null,
        typeVerification: dto.typeVerification,
        objectif: dto.objectif,
        localisation: dto.localisation,
        commune: dto.commune,
        region: dto.region,
        piecesFournies: dto.piecesFournies,
        urgence: dto.urgence ?? 'normale',
        statut: 'demande',
      },
      select: { id: true, referenceInterne: true, statut: true },
    });
    return mission;
  }

  /**
   * Même numérotation que les missions créées en back-office (`V-2026-0007`) :
   * une demande du client n'est pas d'une autre nature.
   */
  private async prochaineReference(): Promise<string> {
    const annee = new Date().getFullYear();
    const prefixe = `V-${annee}-`;
    const emises = await this.prisma.missionVerification.count({
      where: { referenceInterne: { startsWith: prefixe } },
    });
    for (let rang = emises + 1; rang <= emises + 20; rang += 1) {
      const candidate = `${prefixe}${String(rang).padStart(4, '0')}`;
      const prise = await this.prisma.missionVerification.findUnique({
        where: { referenceInterne: candidate },
        select: { id: true },
      });
      if (!prise) return candidate;
    }
    throw new BadRequestException(
      'Impossible d’enregistrer la demande, réessayez',
    );
  }

  async getMissions(userId: string) {
    const prospectId = await this.prospectDuCompte(userId);
    const missions = await this.prisma.missionVerification.findMany({
      where: { prospectId, visibleClient: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceInterne: true,
        typeVerification: true,
        objectif: true,
        localisation: true,
        commune: true,
        region: true,
        statut: true,
        urgence: true,
        dateDemande: true,
        dateEcheance: true,
        dateRapport: true,
        decision: true,
        conclusion: true,
        reserves: true,
        recommandation: true,
        montantDevis: true,
        montantPaye: true,
        terrain: {
          select: {
            id: true,
            nom: true,
            referenceInterne: true,
            commune: true,
            region: true,
          },
        },
        documents: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            storageKey: true,
            resourceType: true,
          },
        },
      },
    });

    return missions.map((mission) => ({
      ...mission,
      montantDevis:
        mission.montantDevis === null ? null : Number(mission.montantDevis),
      montantPaye:
        mission.montantPaye === null ? null : Number(mission.montantPaye),
      documents: mission.documents.map(
        ({ storageKey, resourceType, ...document }) => ({
          ...document,
          secureUrl: this.cloudinary.url(storageKey, resourceType, false),
        }),
      ),
    }));
  }

  /** Lien de téléchargement d'une pièce publiée, pour le client concerné. */
  async getDocument(userId: string, documentId: string) {
    const prospectId = await this.prospectDuCompte(userId);
    const document = await this.prisma.documentMission.findFirst({
      where: {
        id: documentId,
        isPublic: true,
        mission: { prospectId, visibleClient: true },
      },
      select: {
        id: true,
        title: true,
        type: true,
        storageKey: true,
        resourceType: true,
      },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    return {
      id: document.id,
      title: document.title,
      type: document.type,
      secureUrl: this.cloudinary.url(
        document.storageKey,
        document.resourceType,
        false,
      ),
    };
  }

  private async prospectDuCompte(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProspectId: true },
    });
    if (!user?.clientProspectId) {
      throw new ForbiddenException('Ce compte n’est pas rattaché à un client');
    }
    return user.clientProspectId;
  }
}
