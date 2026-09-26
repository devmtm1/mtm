import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import {
  ConstructionAccessService,
  type ConstructionUser,
} from './construction-access.service';
import { ConstructionOptionsService } from './construction-options.service';
import {
  renderChantierReport,
  type ChantierReportData,
} from './chantier-report-renderer';

const documentInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

/** Types de pièce qui sont des médias, pas des documents. */
const MEDIAS = ['photo_chantier'];

/**
 * Pièces d'un chantier : plans, permis, contrats, factures, photos de
 * journée, et le rapport d'avancement généré par MTM.
 *
 * Une pièce n'est visible du client que si elle est explicitement publiée —
 * c'est ce que la section 16 appelle les « rapports autorisés ». Le rapport
 * d'avancement, lui, est publié d'office : c'est ce que le client attend.
 */
@Injectable()
export class DocumentsChantierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: ConstructionAccessService,
    private readonly options: ConstructionOptionsService,
  ) {}

  async findAll(projetId: string, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    const documents = await this.prisma.documentChantier.findMany({
      where: { projetId },
      include: documentInclude,
      orderBy: { createdAt: 'desc' },
    });
    return documents.map(({ storageKey, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, document.resourceType, false),
    }));
  }

  async addDocument(
    projetId: string,
    dto: { type: string; title?: string; entreeJournalId?: string },
    file: Express.Multer.File,
    user: ConstructionUser,
    visibleClient = false,
  ) {
    await this.access.ensureAccessible(projetId, user);
    await this.options.assertTypeDocument(dto.type);
    if (dto.entreeJournalId) {
      const journee = await this.prisma.entreeJournalChantier.findFirst({
        where: { id: dto.entreeJournalId, projetId },
        select: { id: true },
      });
      if (!journee) {
        throw new BadRequestException(
          'Cette journée n’appartient pas à ce chantier',
        );
      }
    }

    validateUploadedAsset(
      file,
      MEDIAS.includes(dto.type) ? 'media' : 'document',
    );
    const uploaded = await this.cloudinary.upload(
      file,
      `construction/${projetId}`,
      false,
    );
    return this.prisma.documentChantier.create({
      data: {
        projetId,
        entreeJournalId: dto.entreeJournalId ?? null,
        type: dto.type,
        title: dto.title,
        visibleClient,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
      include: documentInclude,
    });
  }

  /**
   * Génère le rapport d'avancement et l'archive. Il ne reprend que les
   * journées publiées : le journal interne reste interne.
   */
  async genererRapport(projetId: string, user: ConstructionUser) {
    await this.access.ensureAccessible(projetId, user);
    const projet = await this.prisma.projetConstruction.findUnique({
      where: { id: projetId },
      include: {
        client: {
          select: { nom: true, prenom: true, email: true, telephone: true },
        },
        terrain: { select: { nom: true, referenceInterne: true } },
        jalons: {
          where: { statut: { not: 'annule' } },
          orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
        },
        journal: {
          where: { visibleClient: true },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');

    const data: ChantierReportData = {
      reference: projet.referenceInterne,
      issuedAt: new Date(),
      company: await this.companyInfo(),
      projet: {
        intitule: projet.intitule,
        typeProjet: projet.typeProjet,
        programme: projet.programme,
        adresse: projet.adresse,
        commune: projet.commune,
        region: projet.region,
        surfaceBatie:
          projet.surfaceBatie === null ? null : Number(projet.surfaceBatie),
        nombreNiveaux: projet.nombreNiveaux,
        montantDevis:
          projet.montantDevis === null ? null : Number(projet.montantDevis),
        statut: projet.statut,
        avancement: projet.avancement,
        dateDebutPrevue: projet.dateDebutPrevue,
        dateFinPrevue: projet.dateFinPrevue,
        dateDebutReelle: projet.dateDebutReelle,
        dateFinReelle: projet.dateFinReelle,
      },
      client: {
        nom: [projet.client.prenom, projet.client.nom]
          .filter(Boolean)
          .join(' ')
          .trim(),
        email: projet.client.email,
        telephone: projet.client.telephone,
      },
      terrain: projet.terrain
        ? {
            nom: projet.terrain.nom,
            referenceInterne: projet.terrain.referenceInterne,
          }
        : null,
      jalons: projet.jalons.map((jalon) => ({
        libelle: jalon.libelle,
        statut: jalon.statut,
        avancement: jalon.avancement,
        dateFinPrevue: jalon.dateFinPrevue,
        dateFinReelle: jalon.dateFinReelle,
      })),
      journal: projet.journal.map((entree) => ({
        date: entree.date,
        intervenants: entree.intervenants,
        avancement: entree.avancement,
        observations: entree.observations,
        decisions: entree.decisions,
        prochaineAction: entree.prochaineAction,
      })),
    };

    const pdf = renderChantierReport(data);
    const uploaded = await this.cloudinary.upload(
      {
        buffer: pdf,
        originalname: `rapport-avancement-${projet.referenceInterne}.pdf`,
        mimetype: 'application/pdf',
        size: pdf.length,
      } as Express.Multer.File,
      `construction/${projetId}`,
      false,
    );

    // Chaque génération crée une version : l'avancement d'un chantier se
    // constate à une date, un rapport n'écrase pas le précédent.
    const precedents = await this.prisma.documentChantier.count({
      where: { projetId, type: 'rapport_avancement' },
    });

    const document = await this.prisma.documentChantier.create({
      data: {
        projetId,
        type: 'rapport_avancement',
        title: `Rapport d’avancement du ${data.issuedAt.toLocaleDateString('fr-FR')}`,
        isGenerated: true,
        visibleClient: true,
        version: precedents + 1,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
      include: documentInclude,
    });

    const { storageKey, ...reste } = document;
    return {
      ...reste,
      secureUrl: this.cloudinary.url(storageKey, document.resourceType, false),
    };
  }

  /** Publication d'une pièce vers l'espace client, pièce par pièce. */
  async setVisibility(
    projetId: string,
    documentId: string,
    visibleClient: boolean,
    user: ConstructionUser,
  ) {
    await this.access.ensureAccessible(projetId, user);
    const document = await this.prisma.documentChantier.findFirst({
      where: { id: documentId, projetId },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    return this.prisma.documentChantier.update({
      where: { id: documentId },
      data: { visibleClient },
      include: documentInclude,
    });
  }

  async removeDocument(
    projetId: string,
    documentId: string,
    user: ConstructionUser,
  ): Promise<void> {
    await this.access.ensureAccessible(projetId, user);
    const document = await this.prisma.documentChantier.findFirst({
      where: { id: documentId, projetId },
      select: { id: true, storageKey: true, resourceType: true },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    // Les pièces de chantier sont stockées en accès restreint, comme celles
    // des missions : leur suppression suit le même mode.
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      false,
    );
    await this.prisma.documentChantier.delete({ where: { id: documentId } });
  }

  /**
   * En-tête du rapport, lu dans les blocs de contenu comme celui du rapport
   * de vérification : MTM change ses coordonnées à un seul endroit.
   */
  private async companyInfo(): Promise<ChantierReportData['company']> {
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
