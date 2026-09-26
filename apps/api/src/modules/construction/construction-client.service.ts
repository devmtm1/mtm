import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';

/**
 * Espace client du suivi de chantier (section 16 : « espace client permettant
 * de consulter l'avancement et les rapports autorisés »).
 *
 * Trois choses ne sortent jamais d'ici : le budget interne de MTM et sa
 * marge, les journées de journal non publiées, et les pièces non publiées. Le
 * client a signé un devis ; il a droit à l'avancement de son chantier, au
 * planning, aux journées que MTM lui adresse et aux rapports — pas à la
 * structure de coûts de l'entreprise.
 */
@Injectable()
export class ConstructionClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Chantiers du client : un aperçu par ligne, sans montant interne. */
  async getChantiers(userId: string) {
    const clientId = await this.prospectDuCompte(userId);
    const projets = await this.prisma.projetConstruction.findMany({
      where: { clientId, visibleClient: true },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        referenceInterne: true,
        intitule: true,
        typeProjet: true,
        adresse: true,
        commune: true,
        statut: true,
        avancement: true,
        montantDevis: true,
        dateDebutPrevue: true,
        dateFinPrevue: true,
        dateFinReelle: true,
        terrain: { select: { nom: true, referenceInterne: true } },
      },
    });
    return projets.map((projet) => ({
      ...projet,
      montantDevis:
        projet.montantDevis === null ? null : Number(projet.montantDevis),
    }));
  }

  /**
   * Fiche d'un chantier vue par son client : où en est le planning, ce qui
   * s'est passé sur place, et les pièces qui lui sont destinées.
   */
  async getChantier(userId: string, projetId: string) {
    const clientId = await this.prospectDuCompte(userId);
    const projet = await this.prisma.projetConstruction.findFirst({
      where: { id: projetId, clientId, visibleClient: true },
      select: {
        id: true,
        referenceInterne: true,
        intitule: true,
        typeProjet: true,
        programme: true,
        adresse: true,
        commune: true,
        region: true,
        surfaceBatie: true,
        nombreNiveaux: true,
        montantDevis: true,
        statut: true,
        avancement: true,
        dateDebutPrevue: true,
        dateFinPrevue: true,
        dateDebutReelle: true,
        dateFinReelle: true,
        terrain: { select: { nom: true, referenceInterne: true } },
        responsable: { select: { firstName: true, lastName: true } },
        jalons: {
          where: { statut: { not: 'annule' } },
          orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            libelle: true,
            statut: true,
            avancement: true,
            dateDebutPrevue: true,
            dateFinPrevue: true,
            dateFinReelle: true,
          },
        },
        journal: {
          where: { visibleClient: true },
          orderBy: { date: 'desc' },
          take: 30,
          select: {
            id: true,
            date: true,
            intervenants: true,
            avancement: true,
            observations: true,
            decisions: true,
            prochaineAction: true,
            documents: {
              where: { visibleClient: true },
              select: {
                id: true,
                title: true,
                type: true,
                storageKey: true,
                resourceType: true,
              },
            },
          },
        },
        documents: {
          where: { visibleClient: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            type: true,
            version: true,
            createdAt: true,
            storageKey: true,
            resourceType: true,
          },
        },
      },
    });
    if (!projet) throw new NotFoundException('Chantier introuvable');

    return {
      ...projet,
      surfaceBatie:
        projet.surfaceBatie === null ? null : Number(projet.surfaceBatie),
      montantDevis:
        projet.montantDevis === null ? null : Number(projet.montantDevis),
      journal: projet.journal.map((entree) => ({
        ...entree,
        documents: entree.documents.map((doc) => this.avecLien(doc)),
      })),
      documents: projet.documents.map((doc) => this.avecLien(doc)),
    };
  }

  /** Lien de téléchargement d'une pièce publiée d'un chantier du client. */
  async getDocument(userId: string, documentId: string) {
    const clientId = await this.prospectDuCompte(userId);
    const document = await this.prisma.documentChantier.findFirst({
      where: {
        id: documentId,
        visibleClient: true,
        projet: { clientId, visibleClient: true },
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
    return this.avecLien(document);
  }

  private avecLien<T extends { storageKey: string; resourceType: string }>(
    document: T,
  ) {
    const { storageKey, ...reste } = document;
    return {
      ...reste,
      secureUrl: this.cloudinary.url(storageKey, document.resourceType, false),
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
