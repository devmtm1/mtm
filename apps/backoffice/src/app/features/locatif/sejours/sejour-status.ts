import type {
  EtatPiece,
  StatutReglementSejour,
  StatutResiliation,
  StatutSejour,
} from '../../../core/models/sejour.model';

export interface Signification {
  label: string;
  /** Classes du composant « pastille » global. */
  pill: string;
  help: string;
}

/** Cycle d'un séjour : on avance, on ne revient pas en arrière. */
export const STATUTS_SEJOUR: Record<StatutSejour, Signification> = {
  demande: {
    label: 'Demande à traiter',
    pill: 'status-pill status-pill--warning',
    help: 'Reçue du site ou saisie en attente : elle n’occupe pas encore le calendrier.',
  },
  confirmee: {
    label: 'Confirmé',
    pill: 'status-pill status-pill--info',
    help: 'Les nuits sont réservées : aucun autre séjour ne peut les prendre.',
  },
  en_cours: {
    label: 'En cours',
    pill: 'status-pill status-pill--primary',
    help: 'Le client est arrivé.',
  },
  terminee: { label: 'Terminé', pill: 'status-pill status-pill--success', help: 'Le client est parti.' },
  annulee: { label: 'Annulé', pill: 'status-pill status-pill--danger', help: 'Réservation annulée : les nuits sont libres.' },
};

export const STATUTS_REGLEMENT: Record<StatutReglementSejour, Signification> = {
  non_regle: { label: 'Non réglé', pill: 'status-pill status-pill--danger', help: 'Aucun règlement reçu.' },
  acompte: { label: 'Acompte versé', pill: 'status-pill status-pill--warning', help: 'Il reste un solde à payer.' },
  solde: { label: 'Soldé', pill: 'status-pill status-pill--success', help: 'Le séjour est entièrement réglé.' },
  trop_percu: { label: 'Trop-perçu', pill: 'status-pill status-pill--info', help: 'Plus que le prix du séjour a été versé.' },
};

export const STATUTS_CAUTION_SEJOUR: Record<string, Signification> = {
  non_versee: { label: 'Non versée', pill: 'status-pill', help: 'La caution n’a pas encore été reçue.' },
  versee: { label: 'Détenue', pill: 'status-pill status-pill--warning', help: 'Reçue : à rendre au départ du client.' },
  restituee: { label: 'Restituée', pill: 'status-pill status-pill--success', help: 'Rendue en totalité.' },
  partiellement_retenue: {
    label: 'Retenue en partie',
    pill: 'status-pill status-pill--info',
    help: 'Rendue, moins une retenue justifiée.',
  },
  retenue_totale: { label: 'Retenue', pill: 'status-pill status-pill--danger', help: 'Conservée en totalité.' },
};

export const SOURCES_SEJOUR: Record<string, string> = {
  direct: 'Direct',
  site: 'Site MTM',
  airbnb: 'Airbnb',
  booking: 'Booking',
  whatsapp: 'WhatsApp',
  autre: 'Autre',
};

export const TYPES_PAIEMENT_SEJOUR: Record<string, string> = { acompte: 'Acompte', solde: 'Solde' };

export const MODES_LOCATION: Record<string, string> = {
  longue_duree: 'Location au mois (bail)',
  courte_duree: 'Location à la nuit (type Airbnb)',
};

export const ETATS_PIECE: Record<EtatPiece, { label: string; ordre: number }> = {
  bon: { label: 'Bon état', ordre: 0 },
  usage: { label: 'Usure normale', ordre: 1 },
  degrade: { label: 'Dégradé', ordre: 2 },
  hors_service: { label: 'Hors service', ordre: 3 },
};

/** Pièces proposées d'office pour un état des lieux neuf. */
export const PIECES_PAR_DEFAUT = ['Entrée', 'Salon', 'Cuisine', 'Chambre 1', 'Salle d’eau', 'WC', 'Extérieur'];

export const STATUTS_RESILIATION: Record<StatutResiliation, Signification> = {
  en_attente: { label: 'À traiter', pill: 'status-pill status-pill--warning', help: 'En attente de la réponse de MTM.' },
  acceptee: { label: 'Acceptée', pill: 'status-pill status-pill--success', help: 'Le préavis du bail est ouvert.' },
  refusee: { label: 'Refusée', pill: 'status-pill status-pill--danger', help: 'Le locataire a reçu la raison du refus.' },
  annulee: { label: 'Retirée', pill: 'status-pill', help: 'Le locataire a retiré sa demande.' },
};

export const MOTIFS_RESILIATION: Record<string, string> = {
  demenagement: 'Déménagement',
  changement_travail: 'Changement de travail',
  achat: 'Achat d’un logement',
  difficultes_financieres: 'Difficultés financières',
  fin_de_besoin: 'Plus besoin du logement',
  autre: 'Autre motif',
};

export const CANAUX_RESILIATION: Record<string, string> = {
  portail: 'Espace locataire',
  telephone: 'Téléphone',
  whatsapp: 'WhatsApp',
  courrier: 'Courrier',
  agence: 'Agence',
};

export function libelle(map: Record<string, string>, valeur: string | null | undefined): string {
  return (valeur && map[valeur]) || (valeur ?? '—');
}

export function nomVoyageur(voyageur: { firstName: string; lastName: string } | null | undefined): string {
  return voyageur ? `${voyageur.firstName} ${voyageur.lastName}`.trim() : '—';
}

/** « Appartement vue mer » ou « Appartement à Ngor » : ce qui désigne le bien dans une liste. */
export function nomBien(bien: { titre: string | null; type: string; commune: string | null }): string {
  return bien.titre?.trim() || [bien.type, bien.commune].filter(Boolean).join(' · ');
}

/** « 15/10/2026 » depuis un jour ISO, sans décalage de fuseau. */
export function formatJour(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [annee, mois, jour] = iso.slice(0, 10).split('-');
  return `${jour}/${mois}/${annee}`;
}

/** « 15/10 → 18/10 · 3 nuits ». */
export function periodeSejour(sejour: { dateArrivee: string; dateDepart: string; nuits: number }): string {
  const court = (iso: string) => formatJour(iso).slice(0, 5);
  return `${court(sejour.dateArrivee)} → ${court(sejour.dateDepart)} · ${sejour.nuits} nuit${sejour.nuits > 1 ? 's' : ''}`;
}

export function montant(valeur: number | string | null | undefined): number {
  return Number(valeur ?? 0);
}
