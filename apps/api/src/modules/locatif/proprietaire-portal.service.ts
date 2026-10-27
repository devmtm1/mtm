import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { calculerSoldeBail } from './locatif-finance.helper';

/** Séjours qui comptent pour le propriétaire : une simple demande ou une annulation n'engage rien. */
const STATUTS_SEJOUR_ENGAGES = ['confirmee', 'en_cours', 'terminee'];

/** Au plus cinq séjours par bien : les prochains d'abord, puis les plus récents. */
const SEJOURS_PAR_BIEN = 5;

/** « Aïssatou Ba » → « Aïssatou B. » : le propriétaire sait qui loue, sans coordonnées ni nom complet. */
export function voyageurAbrege(locataire: {
  firstName: string;
  lastName: string;
}): string {
  const initiale = locataire.lastName.trim().charAt(0).toUpperCase();
  return [locataire.firstName.trim(), initiale ? `${initiale}.` : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * Espace propriétaire (section 15 : « loyers encaissés, dépenses, solde,
 * rapports et documents »).
 *
 * Les loyers, le solde et les relevés de gestion sont servis ici. Les dépenses
 * engagées pour le compte du propriétaire appartiennent au module comptabilité
 * (J3.1) : elles rejoindront le solde net dès qu'il existera, sans changer
 * cette interface.
 */
@Injectable()
export class ProprietairePortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getBiens(userId: string) {
    const proprietaireId = await this.proprietaireDuCompte(userId);
    const biens = await this.prisma.bienLocatif.findMany({
      where: { proprietaireId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceInterne: true,
        type: true,
        adresse: true,
        commune: true,
        region: true,
        statut: true,
        modeLocation: true,
        sejours: {
          where: { statut: { in: STATUTS_SEJOUR_ENGAGES } },
          orderBy: { dateArrivee: 'desc' },
          select: {
            id: true,
            referenceInterne: true,
            statut: true,
            source: true,
            dateArrivee: true,
            dateDepart: true,
            nuits: true,
            montantTotal: true,
            locataire: { select: { firstName: true, lastName: true } },
            paiements: { select: { montant: true } },
          },
        },
        baux: {
          where: { statut: { in: ['actif', 'preavis'] } },
          take: 1,
          orderBy: { dateDebut: 'desc' },
          select: {
            id: true,
            referenceInterne: true,
            loyerMensuel: true,
            charges: true,
            dateDebut: true,
            statut: true,
            situationPaiement: true,
            preavisDepartPrevu: true,
            locataire: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const aujourdhui = debutDeJournee();
    return Promise.all(
      biens.map(async (bien) => {
        const bail = bien.baux[0] ?? null;
        const nuit = bien.modeLocation === 'courte_duree';
        const sejours = bien.sejours.map((sejour) => ({
          id: sejour.id,
          referenceInterne: sejour.referenceInterne,
          statut: sejour.statut,
          source: sejour.source,
          dateArrivee: sejour.dateArrivee,
          dateDepart: sejour.dateDepart,
          nuits: sejour.nuits,
          voyageur: voyageurAbrege(sejour.locataire),
          montantTotal: Number(sejour.montantTotal),
          /** Règlements reçus du voyageur. */
          encaisse: sejour.paiements.reduce(
            (somme, paiement) => somme + Number(paiement.montant),
            0,
          ),
        }));
        const enCours = sejours.find(
          (sejour) =>
            sejour.statut === 'en_cours' ||
            (sejour.statut === 'confirmee' &&
              sejour.dateArrivee <= aujourdhui &&
              sejour.dateDepart > aujourdhui),
        );
        const aVenir = sejours
          .filter(
            (sejour) =>
              sejour.statut === 'confirmee' && sejour.dateArrivee > aujourdhui,
          )
          .sort((a, b) => a.dateArrivee.getTime() - b.dateArrivee.getTime());
        // En courte durée, le bien reste « disponible » à la vente comme à la
        // réservation : ce qui compte pour le propriétaire, c'est le séjour.
        const occupation = !nuit
          ? null
          : enCours
            ? 'occupe'
            : aVenir.length > 0
              ? 'reserve'
              : 'libre';
        const apercu = [
          ...(enCours ? [enCours] : []),
          ...aVenir.filter((sejour) => sejour !== enCours),
          ...sejours.filter(
            (sejour) => sejour !== enCours && !aVenir.includes(sejour),
          ),
        ].slice(0, SEJOURS_PAR_BIEN);
        const solde = bail
          ? await calculerSoldeBail(this.prisma, bail.id)
          : null;
        return {
          id: bien.id,
          referenceInterne: bien.referenceInterne,
          type: bien.type,
          adresse: bien.adresse,
          commune: bien.commune,
          region: bien.region,
          statut: bien.statut,
          modeLocation: bien.modeLocation,
          occupation,
          sejours: apercu,
          sejoursEncaisses: sejours.reduce(
            (somme, sejour) => somme + sejour.encaisse,
            0,
          ),
          bail: bail
            ? {
                id: bail.id,
                referenceInterne: bail.referenceInterne,
                loyerMensuel: Number(bail.loyerMensuel),
                charges: bail.charges === null ? null : Number(bail.charges),
                dateDebut: bail.dateDebut,
                statut: bail.statut,
                situationPaiement: bail.situationPaiement,
                preavisDepartPrevu: bail.preavisDepartPrevu,
                locataire:
                  [bail.locataire.firstName, bail.locataire.lastName]
                    .filter(Boolean)
                    .join(' ') || null,
                /** Loyers appelés depuis le début du bail. */
                loyersDus: solde?.loyersDus ?? 0,
                /** Encaissements validés, donc réellement acquis. */
                loyersEncaisses: solde?.loyersEncaisses ?? 0,
                /** Ce qu'il reste à recouvrer auprès du locataire. */
                solde: solde?.solde ?? 0,
                echeancesImpayees: solde?.echeancesImpayees ?? 0,
              }
            : null,
        };
      }),
    );
  }

  /**
   * Synthèse du portefeuille, telle que l'attend l'espace propriétaire :
   * loyers appelés, encaissés et solde restant, tous biens confondus.
   */
  async getSynthese(userId: string) {
    const proprietaireId = await this.proprietaireDuCompte(userId);
    const baux = await this.prisma.bailLocatif.findMany({
      where: { bienLocatif: { proprietaireId } },
      select: { id: true },
    });
    const soldes = await Promise.all(
      baux.map((bail) => calculerSoldeBail(this.prisma, bail.id)),
    );
    const aujourdhui = debutDeJournee();
    const engages = {
      statut: { in: STATUTS_SEJOUR_ENGAGES },
      bienLocatif: { proprietaireId },
    };
    const [biens, loues, occupes, aVenir, paiementsSejours, biensALaNuit] =
      await Promise.all([
        this.prisma.bienLocatif.count({ where: { proprietaireId } }),
        this.prisma.bienLocatif.count({
          where: { proprietaireId, statut: 'loue' },
        }),
        // Un bien en courte durée est « occupé » le temps d'un séjour en cours.
        this.prisma.bienLocatif.count({
          where: {
            proprietaireId,
            modeLocation: 'courte_duree',
            sejours: {
              some: {
                statut: { in: ['confirmee', 'en_cours'] },
                dateArrivee: { lte: aujourdhui },
                dateDepart: { gt: aujourdhui },
              },
            },
          },
        }),
        this.prisma.sejourLocatif.count({
          where: {
            ...engages,
            statut: 'confirmee',
            dateArrivee: { gt: aujourdhui },
          },
        }),
        this.prisma.paiementSejour.aggregate({
          where: { sejour: engages },
          _sum: { montant: true },
        }),
        this.prisma.bienLocatif.count({
          where: { proprietaireId, modeLocation: 'courte_duree' },
        }),
      ]);

    return soldes.reduce(
      (cumul, solde) => ({
        ...cumul,
        loyersDus: cumul.loyersDus + solde.loyersDus,
        loyersEncaisses: cumul.loyersEncaisses + solde.loyersEncaisses,
        solde: cumul.solde + solde.solde,
        echeancesImpayees: cumul.echeancesImpayees + solde.echeancesImpayees,
      }),
      {
        biens,
        loues: loues + occupes,
        biensALaNuit,
        sejoursAVenir: aVenir,
        sejoursEncaisses: Number(paiementsSejours._sum.montant ?? 0),
        loyersDus: 0,
        loyersEncaisses: 0,
        solde: 0,
        echeancesImpayees: 0,
      },
    );
  }

  /** Relevés de gestion et pièces publiées au propriétaire, jamais celles du locataire. */
  async getDocuments(userId: string) {
    const proprietaireId = await this.proprietaireDuCompte(userId);
    const documents = await this.prisma.documentLocatif.findMany({
      where: {
        visibleProprietaire: true,
        bailLocatif: { bienLocatif: { proprietaireId } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true,
        storageKey: true,
        resourceType: true,
        bailLocatif: {
          select: {
            bienLocatif: { select: { referenceInterne: true, adresse: true } },
          },
        },
      },
    });
    return documents.map(({ storageKey, resourceType, ...document }) => ({
      ...document,
      secureUrl: this.cloudinary.url(storageKey, resourceType, false),
    }));
  }

  private async proprietaireDuCompte(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clientProprietaireId: true },
    });
    if (!user?.clientProprietaireId) {
      throw new ForbiddenException(
        'Ce compte n’est pas rattaché à un propriétaire',
      );
    }
    return user.clientProprietaireId;
  }
}

/** Minuit UTC du jour : les dates de séjour sont des dates sans heure. */
function debutDeJournee(): Date {
  const maintenant = new Date();
  return new Date(
    Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate(),
    ),
  );
}
