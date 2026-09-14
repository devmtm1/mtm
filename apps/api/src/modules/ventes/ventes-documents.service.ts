import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { CreateDocumentVenteDto } from './dto/create-document-vente.dto';
import { VentesAccessService, type MandatUser } from './ventes-access.service';
import {
  DEFAULT_DOCUMENT_TYPES,
  GENERATED_DOCUMENT_TYPES,
} from './ventes-workflow.service';
import {
  renderVenteDocument,
  type VenteDocumentData,
} from './vente-document-renderer';

/** Préfixe de numérotation par type de document généré. */
const DOCUMENT_PREFIXES: Record<string, string> = {
  facture: 'FAC',
  recu: 'REC',
  bon_reservation: 'BR',
  contrat: 'CTR',
  etat_paiement: 'EP',
};

/**
 * GED des dossiers de vente (J1.6, section 17 CDC) : dépôt, génération PDF
 * (bon de réservation, reçu, facture, contrat, état de paiement), suppression
 * et recherche des documents.
 */
@Injectable()
export class VentesDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: VentesAccessService,
    private readonly settings: SettingsService,
  ) {}

  private getAllowedDocumentTypes(): Promise<string[]> {
    return this.settings.getStringList(
      'ventes.documentTypes',
      DEFAULT_DOCUMENT_TYPES,
    );
  }

  async addDocument(
    id: string,
    dto: CreateDocumentVenteDto,
    file: Express.Multer.File,
    user: MandatUser,
    isPublic = false,
  ) {
    await this.access.ensureAccessible(id, user);
    // Taille, type MIME et signature binaire : règle unique pour tout le projet.
    validateUploadedAsset(file, 'document');
    const allowedDocumentTypes = await this.getAllowedDocumentTypes();
    if (!allowedDocumentTypes.includes(dto.type))
      throw new BadRequestException('Type de document invalide');
    const uploaded = await this.cloudinary.upload(file, `ventes/${id}`, false);
    return this.prisma.documentVente.create({
      data: {
        dossierVenteId: id,
        type: dto.type,
        title: dto.title,
        isPublic,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
    });
  }

  async generateDocument(
    id: string,
    dto: CreateDocumentVenteDto,
    user: MandatUser,
    isPublic = false,
  ) {
    await this.access.ensureAccessible(id, user);
    const allowedDocumentTypes = await this.getAllowedDocumentTypes();
    if (
      !allowedDocumentTypes.includes(dto.type) ||
      !GENERATED_DOCUMENT_TYPES.includes(dto.type)
    )
      throw new BadRequestException(
        'Ce type de document ne peut pas être généré automatiquement',
      );

    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      select: {
        id: true,
        referenceInterne: true,
        statut: true,
        prixVente: true,
        createdAt: true,
        prospect: {
          select: { nom: true, prenom: true, email: true, telephone: true },
        },
        terrain: {
          select: {
            nom: true,
            referenceInterne: true,
            commune: true,
            region: true,
            localisationDetail: true,
            superficie: true,
            uniteSuperficie: true,
          },
        },
        reservations: { orderBy: { createdAt: 'desc' }, take: 1 },
        paiements: { orderBy: { datePaiement: 'asc' } },
        echeances: { orderBy: { numero: 'asc' } },
      },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');

    const issuedAt = new Date();
    const sequence = await this.prisma.documentVente.count({
      where: { dossierVenteId: id, type: dto.type, isGenerated: true },
    });
    const data: VenteDocumentData = {
      type: dto.type,
      title: dto.title ?? this.defaultDocumentTitle(dto.type),
      reference: `${DOCUMENT_PREFIXES[dto.type] ?? 'DOC'}-${(dossier.referenceInterne ?? id.slice(0, 8)).replace(/^DV-/, '')}-${String(sequence + 1).padStart(2, '0')}`,
      issuedAt,
      company: await this.companyInfo(),
      dossier: {
        referenceInterne: dossier.referenceInterne,
        statut: dossier.statut,
        prixVente:
          dossier.prixVente === null ? null : Number(dossier.prixVente),
        createdAt: dossier.createdAt,
      },
      client: {
        nom:
          [dossier.prospect?.prenom, dossier.prospect?.nom]
            .filter(Boolean)
            .join(' ') || 'Client non renseigné',
        email: dossier.prospect?.email ?? null,
        telephone: dossier.prospect?.telephone ?? null,
      },
      terrain: dossier.terrain
        ? {
            ...dossier.terrain,
            superficie:
              dossier.terrain.superficie === null
                ? null
                : Number(dossier.terrain.superficie),
          }
        : null,
      reservation: dossier.reservations[0]
        ? {
            reference: dossier.reservations[0].reference,
            montantAcompte: Number(dossier.reservations[0].montantAcompte),
            dateDebut: dossier.reservations[0].dateDebut,
            dateExpiration: dossier.reservations[0].dateExpiration,
            statut: dossier.reservations[0].statut,
          }
        : null,
      paiements: dossier.paiements.map((p) => ({
        montant: Number(p.montant),
        datePaiement: p.datePaiement,
        mode: p.mode,
        reference: p.reference,
        statut: p.statut,
      })),
      echeances: dossier.echeances.map((e) => ({
        numero: e.numero,
        dateEcheance: e.dateEcheance,
        montantPrevu: Number(e.montantPrevu),
        montantPaye: Number(e.montantPaye),
        statut: e.statut,
      })),
    };
    const buffer = renderVenteDocument(data);
    const file = {
      buffer,
      mimetype: 'application/pdf',
      originalname: `${dto.type}.pdf`,
      size: buffer.length,
    } as Express.Multer.File;

    const uploaded = await this.cloudinary.upload(
      file,
      `ventes/${id}/documents`,
      false,
    );
    return this.prisma.documentVente.create({
      data: {
        dossierVenteId: id,
        type: dto.type,
        title: dto.title ?? this.defaultDocumentTitle(dto.type),
        isGenerated: true,
        isPublic,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
    });
  }

  async removeDocument(id: string, documentId: string, user: MandatUser) {
    await this.access.ensureAccessible(id, user);
    const document = await this.prisma.documentVente.findFirst({
      where: { id: documentId, dossierVenteId: id },
    });
    if (!document) throw new NotFoundException('Document de vente introuvable');
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      false,
    );
    await this.prisma.documentVente.delete({ where: { id: documentId } });
  }

  /** Coordonnées affichées sur les documents : celles publiées sur le site. */
  private async companyInfo(): Promise<VenteDocumentData['company']> {
    const blocks = await this.prisma.contentBlock.findMany({
      where: {
        key: { in: ['contact.adresse', 'contact.telephone', 'contact.email'] },
        isActive: true,
      },
      select: { key: true, content: true },
    });
    const get = (key: string, fallback: string): string =>
      blocks.find((block) => block.key === key)?.content?.trim() || fallback;
    return {
      name: 'MTM Immobilier',
      tagline: 'Achat · Vente · Gérance immobilière & BTP',
      adresse: get('contact.adresse', 'Dakar, Sénégal'),
      telephone: get('contact.telephone', ''),
      email: get('contact.email', ''),
    };
  }

  private defaultDocumentTitle(type: string): string {
    const titles: Record<string, string> = {
      bon_reservation: 'Bon de réservation',
      recu: 'Reçu',
      facture: 'Facture',
      contrat: 'Contrat de vente',
      etat_paiement: 'État de paiement',
      justificatif: 'Justificatif',
      autre: 'Document de vente',
    };
    return titles[type] ?? 'Document de vente';
  }

  async searchDocuments(
    query: {
      dossierVenteId?: string;
      prospectId?: string;
      terrainId?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    user: MandatUser,
  ) {
    const where: Prisma.DocumentVenteWhereInput = {};

    if (query.dossierVenteId) {
      const accessible = await this.prisma.dossierVente.findFirst({
        where: {
          id: query.dossierVenteId,
          ...this.access.ownershipFilter(user),
        },
        select: { id: true },
      });
      if (!accessible)
        throw new ForbiddenException('Accès refusé à ce dossier');
      where.dossierVenteId = query.dossierVenteId;
    } else if (query.prospectId) {
      const dossierIds = await this.prisma.dossierVente.findMany({
        where: {
          prospectId: query.prospectId,
          ...this.access.ownershipFilter(user),
        },
        select: { id: true },
      });
      where.dossierVenteId = { in: dossierIds.map((d) => d.id) };
    } else if (query.terrainId) {
      const dossierIds = await this.prisma.dossierVente.findMany({
        where: {
          terrainId: query.terrainId,
          ...this.access.ownershipFilter(user),
        },
        select: { id: true },
      });
      where.dossierVenteId = { in: dossierIds.map((d) => d.id) };
    } else {
      const dossierIds = await this.prisma.dossierVente.findMany({
        where: this.access.ownershipFilter(user),
        select: { id: true },
      });
      where.dossierVenteId = { in: dossierIds.map((d) => d.id) };
    }

    if (query.type) where.type = query.type;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const documents = await this.prisma.documentVente.findMany({
      where,
      include: {
        dossierVente: {
          select: { id: true, referenceInterne: true, prospectId: true },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return documents.map(({ storageKey, resourceType, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, resourceType, false),
    }));
  }
}
