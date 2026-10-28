import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { NotificationsService } from '../notifications/notifications.service';
import { IncidentsLocatifService } from './incidents.service';
import {
  calculerEtatCaution,
  calculerSoldeBail,
} from './locatif-finance.helper';
import type { CreateIncidentDto } from './dto/incident.dto';
import { TYPE_ASSURANCE, type DepotAssuranceDto } from './dto/assurance.dto';

/**
 * Espace locataire (sections 4 et 15 : « bail, loyers, quittances, paiements,
 * **caution**, incidents et **demandes** »). Le locataire ne voit que ses
 * propres baux, ses versements et les pièces publiées pour lui — jamais un
 * relevé destiné au propriétaire, jamais le dossier d'un autre locataire.
 */
@Injectable()
export class LocatairePortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly incidents: IncidentsLocatifService,
    private readonly notifications: NotificationsService,
  ) {}

  async getBaux(userId: string) {
    const locataireId = await this.locataireDuCompte(userId);
    const baux = await this.prisma.bailLocatif.findMany({
      where: { locataireId },
      orderBy: { dateDebut: 'desc' },
      select: {
        id: true,
        referenceInterne: true,
        loyerMensuel: true,
        charges: true,
        jourEcheance: true,
        dateDebut: true,
        dateFin: true,
        statut: true,
        situationPaiement: true,
        preavisDonneLe: true,
        preavisDepartPrevu: true,
        dateSortieReelle: true,
        cautionMontant: true,
        cautionStatut: true,
        regularisationMontant: true,
        bienLocatif: {
          select: {
            referenceInterne: true,
            adresse: true,
            commune: true,
            region: true,
            type: true,
          },
        },
        echeances: {
          where: { statut: { not: 'annulee' } },
          orderBy: { periode: 'asc' },
          select: {
            id: true,
            periode: true,
            dateEcheance: true,
            montantPrevu: true,
            montantPaye: true,
            statut: true,
          },
        },
        mouvementsCaution: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            type: true,
            montant: true,
            date: true,
            justification: true,
          },
        },
        documents: {
          where: { visibleLocataire: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
            storageKey: true,
            resourceType: true,
            controleStatut: true,
            dateExpiration: true,
            motifRejet: true,
          },
        },
      },
    });

    return Promise.all(
      baux.map(async (bail) => {
        const [solde, caution] = await Promise.all([
          calculerSoldeBail(this.prisma, bail.id),
          calculerEtatCaution(
            this.prisma,
            bail.id,
            Number(bail.cautionMontant ?? 0),
          ),
        ]);
        return {
          id: bail.id,
          referenceInterne: bail.referenceInterne,
          loyerMensuel: Number(bail.loyerMensuel),
          charges: bail.charges === null ? null : Number(bail.charges),
          jourEcheance: bail.jourEcheance,
          dateDebut: bail.dateDebut,
          dateFin: bail.dateFin,
          statut: bail.statut,
          situationPaiement: bail.situationPaiement,
          preavisDonneLe: bail.preavisDonneLe,
          preavisDepartPrevu: bail.preavisDepartPrevu,
          dateSortieReelle: bail.dateSortieReelle,
          regularisationMontant:
            bail.regularisationMontant === null
              ? null
              : Number(bail.regularisationMontant),
          bien: bail.bienLocatif,
          // Section 15 : le solde du locataire, recalculé, jamais saisi.
          solde: {
            loyersDus: solde.loyersDus,
            loyersRegles: solde.loyersEncaisses,
            resteADevoir: solde.solde,
            enAttenteDeValidation: solde.encaissementsEnAttente,
          },
          caution: {
            montantPrevu: Number(bail.cautionMontant ?? 0),
            verse: caution.verse,
            retenu: caution.retenu,
            rembourse: caution.rembourse,
            detenu: caution.disponible,
            statut: caution.statut,
            mouvements: bail.mouvementsCaution.map((mouvement) => ({
              ...mouvement,
              montant: Number(mouvement.montant),
            })),
          },
          echeances: bail.echeances.map((echeance) => ({
            ...echeance,
            montantPrevu: Number(echeance.montantPrevu),
            montantPaye: Number(echeance.montantPaye),
          })),
          documents: bail.documents.map(
            ({
              storageKey,
              resourceType,
              controleStatut: _controle,
              dateExpiration: _expiration,
              motifRejet: _motif,
              ...document
            }) => ({
              ...document,
              secureUrl: this.cloudinary.url(storageKey, resourceType, false),
            }),
          ),
          assurance: this.etatAssurance(bail.documents),
        };
      }),
    );
  }

  /**
   * Historique des paiements du locataire, tous baux confondus. Les versements
   * en attente de contrôle y figurent avec leur statut : le locataire voit que
   * son règlement est bien enregistré, sans qu'il soit compté comme validé.
   */
  async getPaiements(userId: string) {
    const locataireId = await this.locataireDuCompte(userId);
    const paiements = await this.prisma.paiementLoyer.findMany({
      where: { bailLocatif: { locataireId }, statut: { not: 'rejete' } },
      orderBy: { datePaiement: 'desc' },
      select: {
        id: true,
        type: true,
        montant: true,
        datePaiement: true,
        modePaiement: true,
        reference: true,
        statut: true,
        bailLocatif: { select: { referenceInterne: true } },
      },
    });
    return paiements.map((paiement) => ({
      ...paiement,
      montant: Number(paiement.montant),
    }));
  }

  /** Incidents et demandes du locataire (sections 4 et 15). */
  async getSignalements(userId: string, nature?: string) {
    const locataireId = await this.locataireDuCompte(userId);
    return this.prisma.incidentLocatif.findMany({
      where: {
        bailLocatif: { locataireId },
        ...(nature ? { nature } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nature: true,
        type: true,
        description: true,
        statut: true,
        resolutionNotes: true,
        createdAt: true,
        resolvedAt: true,
        bailLocatif: { select: { id: true, referenceInterne: true } },
      },
    });
  }

  /** Signalement d'un incident ou dépôt d'une demande, sur un de ses baux. */
  async signalerIncident(
    userId: string,
    bailLocatifId: string,
    dto: CreateIncidentDto,
  ) {
    const locataireId = await this.locataireDuCompte(userId);
    const bail = await this.prisma.bailLocatif.findFirst({
      where: { id: bailLocatifId, locataireId },
      select: { id: true },
    });
    if (!bail) throw new NotFoundException('Bail introuvable');
    return this.incidents.creerSignalement(bailLocatifId, dto, userId);
  }

  /**
   * Où en est l'attestation d'assurance habitation : la plus récente fait foi. Une attestation posée par MTM
   * elle-même n'est pas soumise à contrôle, elle compte comme valide. `expiree` laisse le client la renouveler
   * avant que MTM ne le relance.
   */
  private etatAssurance(
    documents: {
      type: string;
      createdAt: Date;
      controleStatut: string | null;
      dateExpiration: Date | null;
      motifRejet: string | null;
    }[],
  ) {
    const attestation = documents.find(
      (document) => document.type === TYPE_ASSURANCE,
    );
    if (!attestation) return null;
    const debutJournee = new Date();
    debutJournee.setUTCHours(0, 0, 0, 0);
    return {
      statut: attestation.controleStatut ?? 'valide',
      dateExpiration: attestation.dateExpiration,
      motifRejet: attestation.motifRejet,
      deposeLe: attestation.createdAt,
      expiree:
        attestation.dateExpiration !== null &&
        attestation.dateExpiration.getTime() < debutJournee.getTime(),
    };
  }

  /**
   * Le locataire dépose son attestation d'assurance sur son bail en cours. Elle reste « en attente » jusqu'au
   * contrôle de MTM, et n'est jamais montrée au propriétaire.
   */
  async deposerAssurance(
    userId: string,
    file: Express.Multer.File,
    dto: DepotAssuranceDto,
  ) {
    const locataireId = await this.locataireDuCompte(userId);
    const bail = await this.prisma.bailLocatif.findFirst({
      where: { locataireId, statut: { in: ['actif', 'preavis'] } },
      orderBy: { dateDebut: 'desc' },
      select: {
        id: true,
        bienLocatif: { select: { id: true, referenceInterne: true } },
        locataire: { select: { firstName: true, lastName: true } },
      },
    });
    if (!bail) {
      throw new BadRequestException(
        'Aucun bail en cours : l’attestation se dépose sur un bail actif',
      );
    }
    validateUploadedAsset(file, 'document');
    const expiration = new Date(dto.dateExpiration);
    const debutJournee = new Date();
    debutJournee.setUTCHours(0, 0, 0, 0);
    if (expiration.getTime() < debutJournee.getTime()) {
      throw new BadRequestException(
        'Cette attestation est expirée : déposez-en une en cours de validité',
      );
    }

    const uploaded = await this.cloudinary.upload(
      file,
      `locatif/${bail.id}/assurance`,
      false,
    );
    const document = await this.prisma.documentLocatif.create({
      data: {
        bailLocatifId: bail.id,
        type: TYPE_ASSURANCE,
        title: 'Attestation d’assurance habitation',
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
        visibleLocataire: true,
        visibleProprietaire: false,
        deposeParLocataire: true,
        controleStatut: 'en_attente',
        dateExpiration: expiration,
        createdById: userId,
      },
      select: { id: true, createdAt: true, dateExpiration: true },
    });

    const nom =
      [bail.locataire.firstName, bail.locataire.lastName]
        .filter(Boolean)
        .join(' ') || 'Locataire';
    void this.notifications.notifierPermission('locatif:modifier', {
      type: 'assurance_a_controler',
      titre: `Assurance à contrôler — ${bail.bienLocatif.referenceInterne}`,
      message: `${nom} a déposé son attestation d’assurance habitation.`,
      lien: `/locatif/biens/${bail.bienLocatif.id}`,
      entityType: 'DocumentLocatif',
      entityId: document.id,
      dedupeKey: `assurance-a-controler:${document.id}`,
    });
    return {
      statut: 'en_attente',
      dateExpiration: document.dateExpiration,
      motifRejet: null,
      deposeLe: document.createdAt,
      expiree: false,
    };
  }

  private async locataireDuCompte(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientLocataireId: true },
    });
    if (!user?.clientLocataireId) {
      throw new ForbiddenException(
        'Ce compte n’est pas rattaché à un locataire',
      );
    }
    return user.clientLocataireId;
  }
}
