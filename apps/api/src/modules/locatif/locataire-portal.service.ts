import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { IncidentsLocatifService } from './incidents.service';
import {
  calculerEtatCaution,
  calculerSoldeBail,
} from './locatif-finance.helper';
import type { CreateIncidentDto } from './dto/incident.dto';

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
            ({ storageKey, resourceType, ...document }) => ({
              ...document,
              secureUrl: this.cloudinary.url(storageKey, resourceType, false),
            }),
          ),
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
    return this.incidents.creerSignalement(bailLocatifId, dto, null);
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
