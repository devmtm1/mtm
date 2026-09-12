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

/**
 * GED des dossiers de vente (J1.6, section 17 CDC) : dépôt, génération PDF
 * (bon de réservation, reçu, facture, contrat, état de paiement), suppression
 * et recherche des documents.
 */
const DOCUMENT_TYPES = [
  'bon_reservation',
  'recu',
  'facture',
  'contrat',
  'etat_paiement',
  'justificatif',
  'autre',
];

@Injectable()
export class VentesDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: VentesAccessService,
    private readonly settings: SettingsService,
  ) {}

  private getAllowedDocumentTypes(): Promise<string[]> {
    return this.settings.getStringList('ventes.documentTypes', DOCUMENT_TYPES);
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
    if (!allowedDocumentTypes.includes(dto.type))
      throw new BadRequestException('Type de document invalide');

    const dossier = await this.prisma.dossierVente.findUnique({
      where: { id },
      select: {
        id: true,
        referenceInterne: true,
        prixVente: true,
        prospect: { select: { nom: true, prenom: true, email: true } },
        terrain: { select: { nom: true, referenceInterne: true } },
        reservations: { orderBy: { createdAt: 'desc' }, take: 1 },
        paiements: { orderBy: { datePaiement: 'desc' }, take: 5 },
      },
    });
    if (!dossier) throw new NotFoundException('Dossier de vente introuvable');

    const textContent = this.buildGeneratedDocumentText(dto.type, dossier);
    const buffer = this.buildValidPdf(textContent);
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

  private buildValidPdf(text: string): Buffer {
    const lines = text.split('\n');
    const escapedLines = lines.map((line) =>
      line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'),
    );

    const contentLines = escapedLines.flatMap((line) => [
      `BT`,
      `/F1 12 Tf`,
      `50 760 Td`,
      `(${line}) Tj`,
      `0 -18 Td`,
      `ET`,
    ]);

    const contentStream = contentLines.join('\n');
    const streamBytes = Buffer.byteLength(contentStream, 'utf8');

    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      `<< /Length ${streamBytes} >>\nstream\n${contentStream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    const pdfParts: Buffer[] = [Buffer.from('%PDF-1.4\n')];
    const offsets: number[] = [0];
    let currentOffset = Buffer.byteLength('%PDF-1.4\n');

    for (let index = 0; index < objects.length; index++) {
      const objectText = `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
      offsets.push(currentOffset);
      pdfParts.push(Buffer.from(objectText, 'utf8'));
      currentOffset += Buffer.byteLength(objectText, 'utf8');
    }

    const xrefOffset = currentOffset;
    const xrefEntries = ['0000000000 65535 f \n'];
    for (let index = 1; index < offsets.length; index++) {
      xrefEntries.push(
        `${String(offsets[index]).padStart(10, '0')} 00000 n \n`,
      );
    }

    pdfParts.push(
      Buffer.from(
        `xref\n0 ${objects.length + 1}\n${xrefEntries.join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
        'utf8',
      ),
    );

    return Buffer.concat(pdfParts);
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

  private buildGeneratedDocumentText(
    type: string,
    dossier: {
      referenceInterne: string | null;
      prixVente: number | string | Prisma.Decimal | null;
      prospect: {
        nom: string | null;
        prenom: string | null;
        email: string | null;
      } | null;
      terrain: { nom: string | null; referenceInterne: string | null } | null;
      reservations: Array<{
        reference?: string | null;
        montantAcompte?: number | string | Prisma.Decimal | null;
      }>;
      paiements: Array<{
        montant?: number | string | Prisma.Decimal | null;
        reference?: string | null;
        mode?: string | null;
      }>;
    },
  ): string {
    const prix = Number(dossier.prixVente ?? 0);
    const montantAcompte = dossier.reservations[0]
      ? Number(dossier.reservations[0].montantAcompte ?? 0)
      : 0;
    const client =
      [dossier.prospect?.prenom, dossier.prospect?.nom]
        .filter(Boolean)
        .join(' ') || 'Client non renseigné';
    const terrainNom = dossier.terrain?.nom ?? 'Terrain non renseigné';
    const documentTypeLabel = this.defaultDocumentTitle(type);
    const paiementText = dossier.paiements.length
      ? dossier.paiements
          .map(
            (p) =>
              `${p.reference ?? 'Paiement'} - ${Number(p.montant ?? 0)} FCFA (${p.mode ?? 'N/A'})`,
          )
          .join('\n')
      : 'Aucun paiement enregistré';

    return [
      `MTM Immobilier`,
      documentTypeLabel,
      `Dossier : ${dossier.referenceInterne ?? 'N/A'}`,
      `Client : ${client}`,
      `Email : ${dossier.prospect?.email ?? 'N/A'}`,
      `Terrain : ${terrainNom} (${dossier.terrain?.referenceInterne ?? 'N/A'})`,
      `Prix de vente : ${prix} FCFA`,
      `Montant d’acompte : ${montantAcompte} FCFA`,
      `Historique paiements :`,
      paiementText,
    ].join('\n');
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
