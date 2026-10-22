/**
 * Calculs d'un séjour de courte durée (location type Airbnb) : nuits, prix,
 * chevauchement de dates, règlement. Purs, sans accès à la base : c'est ce qui
 * rend les règles faciles à tester.
 *
 * Les dates d'un séjour sont des **jours** (arrivée, départ), pas des instants :
 * on les compare à minuit UTC pour qu'aucun fuseau horaire ne décale une nuit.
 */

/** Statuts qui occupent le bien : un autre séjour ne peut pas chevaucher ces dates. */
export const STATUTS_SEJOUR_BLOQUANTS = ['confirmee', 'en_cours'] as const;

/** Statuts après lesquels un séjour ne bouge plus. */
export const STATUTS_SEJOUR_TERMINES = ['terminee', 'annulee'] as const;

const JOUR_MS = 24 * 60 * 60 * 1000;

/** « 2026-10-15 » ou une date quelconque, ramenés à minuit UTC. */
export function jourUtc(valeur: string | Date): Date {
  if (typeof valeur === 'string') {
    return new Date(`${valeur.slice(0, 10)}T00:00:00.000Z`);
  }
  return new Date(
    Date.UTC(
      valeur.getUTCFullYear(),
      valeur.getUTCMonth(),
      valeur.getUTCDate(),
    ),
  );
}

export function nombreNuits(arrivee: Date, depart: Date): number {
  return Math.round(
    (jourUtc(depart).getTime() - jourUtc(arrivee).getTime()) / JOUR_MS,
  );
}

export interface PeriodeSejour {
  arrivee: Date;
  depart: Date;
}

/**
 * Deux séjours se chevauchent quand l'un commence avant que l'autre ne finisse.
 * Le jour de départ n'est pas une nuit occupée : un voyageur peut partir le 15
 * et le suivant arriver le 15.
 */
export function seChevauchent(a: PeriodeSejour, b: PeriodeSejour): boolean {
  return (
    jourUtc(a.arrivee).getTime() < jourUtc(b.depart).getTime() &&
    jourUtc(b.arrivee).getTime() < jourUtc(a.depart).getTime()
  );
}

export interface TarifSejour {
  nuits: number;
  prixNuit: number;
  fraisMenage?: number;
  remise?: number;
}

/** nuits x prix + ménage - remise, jamais négatif. */
export function montantSejour({
  nuits,
  prixNuit,
  fraisMenage = 0,
  remise = 0,
}: TarifSejour): number {
  const total = nuits * prixNuit + fraisMenage - remise;
  return Math.max(Math.round(total * 100) / 100, 0);
}

export type StatutReglementSejour =
  'non_regle' | 'acompte' | 'solde' | 'trop_percu';

export interface SyntheseSejour {
  montantTotal: number;
  totalRegle: number;
  /** Reste à payer (0 une fois soldé). */
  reste: number;
  excedent: number;
  statut: StatutReglementSejour;
}

/** Ce qui a été réglé sur un séjour, le reste dû et l'état du règlement. */
export function syntheseSejour(
  montantTotal: number,
  paiements: Array<{ montant: number }>,
): SyntheseSejour {
  const totalRegle =
    Math.round(
      paiements.reduce((somme, ligne) => somme + ligne.montant, 0) * 100,
    ) / 100;
  const reste = Math.round((montantTotal - totalRegle) * 100) / 100;
  return {
    montantTotal,
    totalRegle,
    reste: Math.max(reste, 0),
    excedent: Math.max(-reste, 0),
    statut:
      totalRegle === 0
        ? 'non_regle'
        : reste > 0
          ? 'acompte'
          : reste === 0
            ? 'solde'
            : 'trop_percu',
  };
}

export interface PeriodeBloquee {
  debut: string;
  fin: string;
}

/** « 2026-10-15 » : la forme publique d'un jour. */
export function formatJour(date: Date): string {
  return jourUtc(date).toISOString().slice(0, 10);
}

/**
 * Le séjour demandé tient-il dans les règles du bien ? Renvoie le motif du
 * refus, ou `null` si tout va bien. Partagé par le back-office et le site.
 */
export function verifierDemandeSejour(
  bien: { nuitsMinimum: number; capaciteVoyageurs: number | null },
  demande: { arrivee: Date; depart: Date; voyageurs: number },
  options: {
    aujourdhui?: Date;
    /** MTM saisit parfois un séjour déjà commencé ou terminé : le site, jamais. */
    autoriserPasse?: boolean;
    maxNuits?: number;
  } = {},
): string | null {
  const {
    aujourdhui = new Date(),
    autoriserPasse = false,
    maxNuits = 90,
  } = options;
  const nuits = nombreNuits(demande.arrivee, demande.depart);
  if (nuits < 1) return 'La date de départ doit être après la date d’arrivée.';
  if (nuits < bien.nuitsMinimum) {
    return `Ce bien se loue ${bien.nuitsMinimum} nuit${bien.nuitsMinimum > 1 ? 's' : ''} minimum.`;
  }
  if (nuits > maxNuits) {
    return `Au-delà de ${maxNuits} nuits, il s’agit d’une location longue durée : contactez-nous.`;
  }
  if (
    !autoriserPasse &&
    jourUtc(demande.arrivee).getTime() < jourUtc(aujourdhui).getTime()
  ) {
    return 'La date d’arrivée est déjà passée.';
  }
  if (bien.capaciteVoyageurs && demande.voyageurs > bien.capaciteVoyageurs) {
    return `Ce bien accueille ${bien.capaciteVoyageurs} personne${bien.capaciteVoyageurs > 1 ? 's' : ''} au plus.`;
  }
  return null;
}
