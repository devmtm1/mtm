import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import {
  DemarchesAccessService,
  type DemarchesUser,
} from './demarches-access.service';
import { DemarchesOptionsService } from './demarches-options.service';
import { CreateDocumentMissionDto } from './dto/etape-mission.dto';
import {
  renderMissionReport,
  type MissionReportData,
} from './mission-report-renderer';

const documentInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

/**
 * Pièces d'une mission : documents fournis par le client, photos de la
 * visite, et le rapport final généré par MTM.
 *
 * Une pièce n'est visible du client que si elle est explicitement publiée —
 * même règle que la GED des ventes. Le rapport, lui, est publié d'office :
 * c'est le livrable de la mission.
 */
@Injectable()
export class DemarchesDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: DemarchesAccessService,
    private readonly options: DemarchesOptionsService,
  ) {}

  async findAll(missionId: string, user: DemarchesUser) {
    await this.access.ensureAccessible(missionId, user);
    const documents = await this.prisma.documentMission.findMany({
      where: { missionId },
      include: documentInclude,
      orderBy: { createdAt: 'desc' },
    });
    return documents.map(({ storageKey, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, document.resourceType, false),
    }));
  }

  async addDocument(
    missionId: string,
    dto: CreateDocumentMissionDto,
    file: Express.Multer.File,
    user: DemarchesUser,
    isPublic = false,
  ) {
    await this.access.ensureAccessible(missionId, user);
    await this.options.assertTypeDocument(dto.type);
    if (dto.etapeId) {
      const constat = await this.prisma.etapeMission.findFirst({
        where: { id: dto.etapeId, missionId },
        select: { id: true },
      });
      if (!constat) {
        throw new BadRequestException(
          'Ce constat n’appartient pas à cette mission',
        );
      }
    }
    // Une photo ou une vidéo de visite est un média ; le reste, un document.
    validateUploadedAsset(
      file,
      dto.type === 'photo_visite' ? 'media' : 'document',
    );
    const uploaded = await this.cloudinary.upload(
      file,
      `demarches/${missionId}`,
      false,
    );
    return this.prisma.documentMission.create({
      data: {
        missionId,
        etapeId: dto.etapeId ?? null,
        type: dto.type,
        title: dto.title,
        isPublic,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
      include: documentInclude,
    });
  }

  /**
   * Génère le rapport de vérification (étape 5) et l'archive. Le rapport est
   * la seule pièce publiée d'office : c'est ce que le client a commandé.
   */
  async generateReport(missionId: string, user: DemarchesUser) {
    await this.access.ensureAccessible(missionId, user);
    const mission = await this.prisma.missionVerification.findUnique({
      where: { id: missionId },
      include: {
        prospect: {
          select: { nom: true, prenom: true, email: true, telephone: true },
        },
        terrain: {
          select: {
            nom: true,
            referenceInterne: true,
            commune: true,
            region: true,
            superficie: true,
            statutJuridique: true,
          },
        },
        responsable: { select: { firstName: true, lastName: true } },
        etapes: {
          orderBy: { realiseeLe: 'asc' },
          include: {
            realiseePar: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!mission) throw new NotFoundException('Mission introuvable');
    if (!mission.decision) {
      throw new BadRequestException(
        'Renseignez la décision de MTM (favorable, défavorable ou à compléter) avant de générer le rapport',
      );
    }
    if (mission.etapes.length === 0) {
      throw new BadRequestException(
        'Aucune vérification enregistrée : un rapport sans constat n’a pas de valeur pour le client',
      );
    }

    const nombre = (valeur: unknown): number | null =>
      valeur === null || valeur === undefined ? null : Number(valeur);
    const nomComplet = (
      personne: { firstName: string | null; lastName: string | null } | null,
    ): string | null =>
      personne
        ? [personne.firstName, personne.lastName].filter(Boolean).join(' ') ||
          null
        : null;

    const data: MissionReportData = {
      reference: mission.referenceInterne ?? mission.id.slice(0, 8),
      issuedAt: new Date(),
      company: await this.companyInfo(),
      mission: {
        typeVerification: mission.typeVerification,
        objectif: mission.objectif,
        localisation: mission.localisation,
        region: mission.region,
        commune: mission.commune,
        latitude: nombre(mission.latitude),
        longitude: nombre(mission.longitude),
        piecesFournies: mission.piecesFournies,
        dateDemande: mission.dateDemande,
        decision: mission.decision,
        conclusion: mission.conclusion,
        reserves: mission.reserves,
        recommandation: mission.recommandation,
        montantDevis: nombre(mission.montantDevis),
        fraisEtude: nombre(mission.fraisEtude),
        montantPaye: nombre(mission.montantPaye),
        faisabiliteConclusion: mission.faisabiliteConclusion,
        faisabiliteNotes: mission.faisabiliteNotes,
      },
      client: {
        nom:
          [mission.prospect?.prenom, mission.prospect?.nom]
            .filter(Boolean)
            .join(' ') || 'Client non renseigné',
        email: mission.prospect?.email ?? null,
        telephone: mission.prospect?.telephone ?? null,
      },
      terrain: mission.terrain
        ? {
            ...mission.terrain,
            superficie: nombre(mission.terrain.superficie),
          }
        : null,
      responsable: nomComplet(mission.responsable),
      etapes: mission.etapes.map((etape) => ({
        type: etape.type,
        titre: etape.titre,
        observations: etape.observations,
        dateVisite: etape.dateVisite,
        latitude: nombre(etape.latitude),
        longitude: nombre(etape.longitude),
        accesDescription: etape.accesDescription,
        environnement: etape.environnement,
        conformiteApparente: etape.conformiteApparente,
        administration: etape.administration,
        interlocuteur: etape.interlocuteur,
        resultat: etape.resultat,
        realiseePar: nomComplet(etape.realiseePar),
        realiseeLe: etape.realiseeLe,
      })),
    };

    const buffer = renderMissionReport(data);
    const file = {
      buffer,
      mimetype: 'application/pdf',
      originalname: 'rapport-verification.pdf',
      size: buffer.length,
    } as Express.Multer.File;
    const uploaded = await this.cloudinary.upload(
      file,
      `demarches/${missionId}/rapports`,
      false,
    );
    const version =
      (await this.prisma.documentMission.count({
        where: { missionId, type: 'rapport', isGenerated: true },
      })) + 1;

    const document = await this.prisma.documentMission.create({
      data: {
        missionId,
        type: 'rapport',
        title: `Rapport de vérification ${data.reference}`,
        isGenerated: true,
        isPublic: true,
        version,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
      include: documentInclude,
    });

    await this.prisma.missionVerification.update({
      where: { id: missionId },
      data: { dateRapport: new Date(), statut: 'rapport' },
    });
    return document;
  }

  /** Rend une pièce visible (ou non) dans l'espace client. */
  async setVisibility(
    missionId: string,
    documentId: string,
    isPublic: boolean,
    user: DemarchesUser,
  ) {
    await this.access.ensureAccessible(missionId, user);
    const document = await this.prisma.documentMission.findFirst({
      where: { id: documentId, missionId },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    return this.prisma.documentMission.update({
      where: { id: documentId },
      data: { isPublic },
      include: documentInclude,
    });
  }

  async removeDocument(
    missionId: string,
    documentId: string,
    user: DemarchesUser,
  ) {
    await this.access.ensureAccessible(missionId, user);
    const document = await this.prisma.documentMission.findFirst({
      where: { id: documentId, missionId },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      false,
    );
    await this.prisma.documentMission.delete({ where: { id: documentId } });
  }

  /** Coordonnées affichées sur le rapport : celles publiées sur le site. */
  private async companyInfo(): Promise<MissionReportData['company']> {
    const blocs = await this.prisma.contentBlock.findMany({
      where: {
        key: { in: ['contact.adresse', 'contact.telephone', 'contact.email'] },
        isActive: true,
      },
      select: { key: true, content: true },
    });
    const valeur = (cle: string, defaut: string): string =>
      blocs.find((bloc) => bloc.key === cle)?.content?.trim() || defaut;
    return {
      name: 'MTM Immobilier',
      tagline: 'Achat · Vente · Gérance immobilière & BTP',
      adresse: valeur('contact.adresse', 'Dakar, Sénégal'),
      telephone: valeur('contact.telephone', ''),
      email: valeur('contact.email', ''),
    };
  }
}
