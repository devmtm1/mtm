import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import {
  LocatifAccessService,
  type LocatifUser,
} from './locatif-access.service';
import { LocatifOptionsService } from './locatif-options.service';
import {
  CreateDocumentLocatifDto,
  VisibiliteDocumentDto,
} from './dto/document.dto';
import { GenererReleveDto } from './dto/releve.dto';
import {
  renderQuittance,
  renderReleveGestion,
  type QuittanceData,
  type ReleveGestionData,
} from './locatif-document-renderer';

const documentInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

/**
 * Pièces d'un bail : contrat, états des lieux, quittances remises au locataire
 * et relevés de gestion remis au propriétaire (section 15 et section 17).
 *
 * Les deux visibilités sont distinctes : publier une quittance au locataire ne
 * l'expose pas au propriétaire, et un relevé de gestion reste invisible du
 * locataire.
 */
@Injectable()
export class DocumentsLocatifService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly access: LocatifAccessService,
    private readonly options: LocatifOptionsService,
  ) {}

  async findAll(bailLocatifId: string, user: LocatifUser) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const documents = await this.prisma.documentLocatif.findMany({
      where: { bailLocatifId },
      include: documentInclude,
      orderBy: { createdAt: 'desc' },
    });
    return documents.map(({ storageKey, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, document.resourceType, false),
    }));
  }

  async addDocument(
    bailLocatifId: string,
    dto: CreateDocumentLocatifDto,
    file: Express.Multer.File,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    await this.options.assertTypeDocument(dto.type);
    validateUploadedAsset(file, 'document');
    const uploaded = await this.cloudinary.upload(
      file,
      `locatif/${bailLocatifId}`,
      false,
    );
    return this.prisma.documentLocatif.create({
      data: {
        bailLocatifId,
        type: dto.type,
        title: dto.title,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        visibleLocataire: dto.visibleLocataire ?? false,
        visibleProprietaire: dto.visibleProprietaire ?? false,
        createdById: user.id,
      },
      include: documentInclude,
    });
  }

  /** Génère la quittance d'une échéance payée et l'archive, publiée d'office au locataire. */
  async genererQuittance(
    bailLocatifId: string,
    echeanceId: string,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const echeance = await this.prisma.echeanceLoyer.findFirst({
      where: { id: echeanceId, bailLocatifId },
      include: {
        bailLocatif: {
          include: {
            locataire: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            bienLocatif: {
              select: { referenceInterne: true, adresse: true, commune: true },
            },
          },
        },
        paiements: {
          where: { statut: 'valide' },
          orderBy: { datePaiement: 'desc' },
          take: 1,
        },
      },
    });
    if (!echeance) throw new NotFoundException('Échéance introuvable');
    if (echeance.statut !== 'payee') {
      throw new BadRequestException(
        'La quittance ne peut être générée qu’une fois l’échéance intégralement réglée et l’encaissement validé',
      );
    }
    const dernierPaiement = echeance.paiements[0];

    const data: QuittanceData = {
      reference: `Q-${echeance.bailLocatif.referenceInterne}-${echeance.periode.getUTCFullYear()}${String(echeance.periode.getUTCMonth() + 1).padStart(2, '0')}`,
      issuedAt: new Date(),
      company: await this.companyInfo(),
      bien: {
        referenceInterne: echeance.bailLocatif.bienLocatif.referenceInterne,
        adresse: echeance.bailLocatif.bienLocatif.adresse,
        commune: echeance.bailLocatif.bienLocatif.commune,
      },
      locataire: {
        nom:
          [
            echeance.bailLocatif.locataire.firstName,
            echeance.bailLocatif.locataire.lastName,
          ]
            .filter(Boolean)
            .join(' ') || 'Locataire',
        email: echeance.bailLocatif.locataire.email,
        telephone: echeance.bailLocatif.locataire.phone,
      },
      periode: echeance.periode,
      montant: Number(echeance.montantPaye),
      datePaiement: dernierPaiement?.datePaiement ?? new Date(),
      modePaiement: dernierPaiement?.modePaiement ?? 'especes',
      reference2: dernierPaiement?.reference ?? null,
    };

    const buffer = renderQuittance(data);
    const uploaded = await this.cloudinary.upload(
      this.pdfFile(buffer, 'quittance.pdf'),
      `locatif/${bailLocatifId}/quittances`,
      false,
    );
    const version =
      (await this.prisma.documentLocatif.count({
        where: { bailLocatifId, type: 'quittance', isGenerated: true },
      })) + 1;

    return this.prisma.documentLocatif.create({
      data: {
        bailLocatifId,
        type: 'quittance',
        title: `Quittance ${data.reference}`,
        isGenerated: true,
        visibleLocataire: true,
        version,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
      include: documentInclude,
    });
  }

  /**
   * Relevé de gestion d'un bien sur une période (backlog J2.1 : l'espace
   * propriétaire doit offrir loyers, solde et **rapports**). Rattaché au bail
   * courant du bien et publié d'office au propriétaire, jamais au locataire.
   */
  async genererReleveGestion(
    bienLocatifId: string,
    dto: GenererReleveDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBienAccessible(bienLocatifId, user);
    const bien = await this.prisma.bienLocatif.findUnique({
      where: { id: bienLocatifId },
      include: {
        proprietaire: {
          select: { firstName: true, lastName: true, email: true },
        },
        baux: {
          orderBy: { dateDebut: 'desc' },
          take: 1,
          include: {
            locataire: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!bien) throw new NotFoundException('Bien locatif introuvable');
    const bail = bien.baux[0];
    if (!bail) {
      throw new BadRequestException(
        'Ce bien n’a aucun bail : il n’y a pas encore de relevé à produire',
      );
    }

    const maintenant = new Date();
    const periodeFin = dto.periodeFin
      ? new Date(dto.periodeFin)
      : new Date(
          Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1),
        );
    const periodeDebut = dto.periodeDebut
      ? new Date(dto.periodeDebut)
      : new Date(
          Date.UTC(
            periodeFin.getUTCFullYear(),
            periodeFin.getUTCMonth() - 11,
            1,
          ),
        );
    if (periodeDebut.getTime() > periodeFin.getTime()) {
      throw new BadRequestException(
        'La période de début doit précéder la période de fin',
      );
    }

    const echeances = await this.prisma.echeanceLoyer.findMany({
      where: {
        bailLocatifId: bail.id,
        statut: { not: 'annulee' },
        periode: { gte: periodeDebut, lte: periodeFin },
      },
      orderBy: { periode: 'asc' },
    });
    const totaux = echeances.reduce(
      (cumul, echeance) => ({
        du: cumul.du + Number(echeance.montantPrevu),
        encaisse: cumul.encaisse + Number(echeance.montantPaye),
        solde: 0,
      }),
      { du: 0, encaisse: 0, solde: 0 },
    );
    totaux.solde = totaux.du - totaux.encaisse;

    const reference = `R-${bien.referenceInterne}-${periodeFin.getUTCFullYear()}${String(periodeFin.getUTCMonth() + 1).padStart(2, '0')}`;
    const data: ReleveGestionData = {
      reference,
      issuedAt: new Date(),
      company: await this.companyInfo(),
      proprietaire: {
        nom:
          [bien.proprietaire.firstName, bien.proprietaire.lastName]
            .filter(Boolean)
            .join(' ') || 'Propriétaire',
        email: bien.proprietaire.email,
      },
      bien: {
        referenceInterne: bien.referenceInterne,
        adresse: bien.adresse,
        commune: bien.commune,
        type: bien.type,
      },
      locataire:
        [bail.locataire.firstName, bail.locataire.lastName]
          .filter(Boolean)
          .join(' ') || null,
      periodeDebut,
      periodeFin,
      lignes: echeances.map((echeance) => ({
        periode: echeance.periode,
        montantPrevu: Number(echeance.montantPrevu),
        montantPaye: Number(echeance.montantPaye),
        statut: echeance.statut,
      })),
      totaux,
    };

    const buffer = renderReleveGestion(data);
    const uploaded = await this.cloudinary.upload(
      this.pdfFile(buffer, 'releve-gestion.pdf'),
      `locatif/${bail.id}/releves`,
      false,
    );
    const version =
      (await this.prisma.documentLocatif.count({
        where: {
          bailLocatifId: bail.id,
          type: 'releve_gestion',
          isGenerated: true,
        },
      })) + 1;

    return this.prisma.documentLocatif.create({
      data: {
        bailLocatifId: bail.id,
        type: 'releve_gestion',
        title: `Relevé de gestion ${reference}`,
        isGenerated: true,
        visibleProprietaire: true,
        version,
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        createdById: user.id,
      },
      include: documentInclude,
    });
  }

  async setVisibility(
    bailLocatifId: string,
    documentId: string,
    dto: VisibiliteDocumentDto,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const document = await this.prisma.documentLocatif.findFirst({
      where: { id: documentId, bailLocatifId },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    return this.prisma.documentLocatif.update({
      where: { id: documentId },
      data: {
        ...(dto.visibleLocataire !== undefined
          ? { visibleLocataire: dto.visibleLocataire }
          : {}),
        ...(dto.visibleProprietaire !== undefined
          ? { visibleProprietaire: dto.visibleProprietaire }
          : {}),
      },
      include: documentInclude,
    });
  }

  async removeDocument(
    bailLocatifId: string,
    documentId: string,
    user: LocatifUser,
  ) {
    await this.access.ensureBailAccessible(bailLocatifId, user);
    const document = await this.prisma.documentLocatif.findFirst({
      where: { id: documentId, bailLocatifId },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    await this.cloudinary.destroy(
      document.storageKey,
      document.resourceType,
      false,
    );
    await this.prisma.documentLocatif.delete({ where: { id: documentId } });
  }

  private pdfFile(buffer: Buffer, nom: string): Express.Multer.File {
    return {
      buffer,
      mimetype: 'application/pdf',
      originalname: nom,
      size: buffer.length,
    } as Express.Multer.File;
  }

  private async companyInfo(): Promise<QuittanceData['company']> {
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
