import type { ClientAssurance } from '../types/locatif';

/** Une attestation qui expire dans moins d'un mois est à renouveler dès maintenant. */
export const JOURS_AVANT_EXPIRATION = 30;

export type EtatAssurance =
  | { code: 'aucune' }
  | { code: 'en_attente' }
  | { code: 'valide'; joursRestants: number | null; bientotExpiree: boolean }
  | { code: 'expiree' }
  | { code: 'rejetee'; motif: string | null };

const JOUR_MS = 86_400_000;

/**
 * Ce que le locataire doit comprendre en un coup d'œil : rien déposé, en cours de vérification, valide (et jusqu'à
 * quand), à renouveler, ou refusée avec son motif. Une attestation validée mais périmée passe devant : le contrôle
 * ne vaut plus rien une fois la date passée.
 */
export function etatAssurance(assurance: ClientAssurance | null | undefined, maintenant: number = Date.now()): EtatAssurance {
  if (!assurance) return { code: 'aucune' };
  if (assurance.statut === 'rejete') return { code: 'rejetee', motif: assurance.motifRejet };
  if (assurance.expiree) return { code: 'expiree' };
  if (assurance.statut === 'en_attente') return { code: 'en_attente' };
  const joursRestants = assurance.dateExpiration
    ? Math.ceil((new Date(assurance.dateExpiration).getTime() - maintenant) / JOUR_MS)
    : null;
  return { code: 'valide', joursRestants, bientotExpiree: joursRestants !== null && joursRestants <= JOURS_AVANT_EXPIRATION };
}

export const TAILLE_MAX_ATTESTATION = 10 * 1024 * 1024;
export const TYPES_ATTESTATION = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** Contrôle côté écran, avant l'envoi : le serveur refait les mêmes vérifications, mais le client n'attend pas pour rien. */
export function verifierDepot(fichier: File | null, dateExpiration: string, aujourdhui: Date = new Date()): string | null {
  if (!fichier) return 'Choisissez le fichier de votre attestation (PDF ou photo).';
  if (!TYPES_ATTESTATION.includes(fichier.type)) return 'Le fichier doit être un PDF ou une image (JPEG, PNG, WebP).';
  if (fichier.size > TAILLE_MAX_ATTESTATION) return 'Le fichier ne doit pas dépasser 10 Mo.';
  if (!dateExpiration) return 'Indiquez la date de fin de validité de votre attestation.';
  const debutJournee = new Date(Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()));
  if (new Date(dateExpiration).getTime() < debutJournee.getTime()) {
    return 'Cette date est passée : déposez une attestation en cours de validité.';
  }
  return null;
}
