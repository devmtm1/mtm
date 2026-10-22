import type { Location, PeriodeIndisponible } from '../types/location';
import { groupDigits } from './format';

/**
 * Calculs d'un séjour à la nuit, côté visiteur. Les dates sont des jours
 * « AAAA-MM-JJ » comparés en UTC : aucun fuseau horaire ne décale une nuit. Le
 * serveur refait les mêmes contrôles — ici, ils servent à dire tout de suite au
 * visiteur ce qui ne va pas, sans attendre l'envoi.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

const enMs = (jour: string): number => Date.parse(`${jour.slice(0, 10)}T00:00:00Z`);

/** AAAA-MM-JJ d'aujourd'hui (heure locale du visiteur). */
export function aujourdhui(maintenant: Date = new Date()): string {
  const decalage = maintenant.getTimezoneOffset() * 60_000;
  return new Date(maintenant.getTime() - decalage).toISOString().slice(0, 10);
}

/** Un jour décalé de `jours` : « 2026-10-15 » + 2 = « 2026-10-17 ». */
export function ajouterJours(jour: string, jours: number): string {
  return new Date(enMs(jour) + jours * JOUR_MS).toISOString().slice(0, 10);
}

export function nombreNuits(arrivee: string, depart: string): number {
  if (!arrivee || !depart) return 0;
  return Math.round((enMs(depart) - enMs(arrivee)) / JOUR_MS);
}

/**
 * Première période déjà prise qui recouvre le séjour demandé, ou `null`. Le jour
 * de départ n'est pas une nuit occupée : partir le 15 et arriver le 15 est permis.
 */
export function periodeEnConflit(
  periodes: PeriodeIndisponible[],
  arrivee: string,
  depart: string,
): PeriodeIndisponible | null {
  if (!arrivee || !depart) return null;
  return periodes.find((periode) => enMs(arrivee) < enMs(periode.fin) && enMs(periode.debut) < enMs(depart)) ?? null;
}

type RegleSejour = Pick<Location, 'nuitsMinimum' | 'capaciteVoyageurs'>;

/** Ce qui empêche d'envoyer la demande, en une phrase ; `null` quand tout va bien. */
export function verifierDates(
  regles: RegleSejour,
  saisie: { arrivee: string; depart: string; voyageurs: number },
  periodes: PeriodeIndisponible[],
  maintenant: Date = new Date(),
): string | null {
  if (!saisie.arrivee || !saisie.depart) return null;
  const nuits = nombreNuits(saisie.arrivee, saisie.depart);
  if (nuits < 1) return 'La date de départ doit être après la date d’arrivée.';
  if (saisie.arrivee < aujourdhui(maintenant)) return 'La date d’arrivée est déjà passée.';
  if (nuits < regles.nuitsMinimum) {
    return `Ce bien se loue ${regles.nuitsMinimum} nuit${regles.nuitsMinimum > 1 ? 's' : ''} minimum.`;
  }
  if (nuits > 90) return 'Au-delà de 90 nuits, il s’agit d’une location longue durée : contactez-nous.';
  if (regles.capaciteVoyageurs && saisie.voyageurs > regles.capaciteVoyageurs) {
    return `Ce bien accueille ${regles.capaciteVoyageurs} personne${regles.capaciteVoyageurs > 1 ? 's' : ''} au plus.`;
  }
  const conflit = periodeEnConflit(periodes, saisie.arrivee, saisie.depart);
  if (conflit) {
    return `Ces dates ne sont pas libres : le bien est réservé du ${formatJourCourt(conflit.debut)} au ${formatJourCourt(conflit.fin)}.`;
  }
  return null;
}

export interface EstimationSejour {
  nuits: number;
  prixNuit: number;
  hebergement: number;
  menage: number;
  total: number;
}

/** Nuits × tarif + ménage : ce que le visiteur lira avant d'envoyer sa demande. */
export function estimerSejour(
  location: Pick<Location, 'prixNuit' | 'fraisMenage'>,
  nuits: number,
): EstimationSejour | null {
  if (nuits < 1 || location.prixNuit === null) return null;
  const hebergement = nuits * location.prixNuit;
  const menage = location.fraisMenage ?? 0;
  return { nuits, prixNuit: location.prixNuit, hebergement, menage, total: hebergement + menage };
}

/** « 15/10/2026 ». */
export function formatJourCourt(jour: string): string {
  const [annee, mois, j] = jour.slice(0, 10).split('-');
  return `${j}/${mois}/${annee}`;
}

/** « 15 oct. → 18 oct. 2026 » : une période lisible d'un coup d'œil. */
export function formatPeriode(periode: PeriodeIndisponible): string {
  const format = (jour: string, avecAnnee: boolean) =>
    new Date(enMs(jour)).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      ...(avecAnnee ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    });
  return `${format(periode.debut, false)} → ${format(periode.fin, true)}`;
}

export function formatMontant(valeur: number): string {
  return `${groupDigits(Math.round(valeur))} FCFA`;
}
