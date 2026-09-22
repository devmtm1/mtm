/**
 * Libellés français des codes techniques renvoyés par l'API pour l'espace
 * client. Alignés sur ceux du back-office (ventes-status.ts) : le client
 * lit « Réservé », jamais `reserve`.
 */
export type Tone = 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'neutral';

export interface StatusLabel {
  label: string;
  tone: Tone;
  /** Ce que le statut signifie pour le client. */
  help: string;
}

export const DOSSIER_STATUS: Record<string, StatusLabel> = {
  en_cours: { label: 'En cours', tone: 'info', help: 'Votre dossier est ouvert : votre conseiller prépare les prochaines étapes.' },
  pre_reserve: { label: 'Pré-réservé', tone: 'warning', help: 'Votre intention est enregistrée ; l’acompte confirmera la réservation.' },
  reserve: { label: 'Réservé', tone: 'warning', help: 'Le terrain est bloqué pour vous jusqu’à la date indiquée.' },
  paiement_partiel: { label: 'Paiement en cours', tone: 'primary', help: 'Une partie du prix est réglée ; le solde reste à verser.' },
  solde: { label: 'Soldé', tone: 'success', help: 'Le prix est intégralement payé : félicitations, la vente est conclue.' },
  annule: { label: 'Annulé', tone: 'neutral', help: 'Ce dossier a été clos sans suite.' },
};

export const RESERVATION_STATUS: Record<string, StatusLabel> = {
  active: { label: 'Active', tone: 'warning', help: 'Le terrain vous est réservé jusqu’à la date d’expiration.' },
  confirmee: { label: 'Confirmée', tone: 'success', help: 'Réservation confirmée par votre paiement.' },
  expiree: { label: 'Expirée', tone: 'neutral', help: 'Le délai est passé : contactez-nous pour la renouveler.' },
  annulee: { label: 'Annulée', tone: 'neutral', help: 'Réservation annulée.' },
};

export const ECHEANCE_STATUS: Record<string, StatusLabel> = {
  planifiee: { label: 'À venir', tone: 'neutral', help: 'Prochaine échéance prévue.' },
  en_attente: { label: 'À régler', tone: 'warning', help: 'Échéance arrivée : le versement est attendu.' },
  partielle: { label: 'Partielle', tone: 'info', help: 'Une partie de cette échéance est payée.' },
  payee: { label: 'Réglée', tone: 'success', help: 'Échéance entièrement payée.' },
  en_retard: { label: 'En retard', tone: 'accent', help: 'La date est passée : contactez votre conseiller.' },
};

export const PAYMENT_MODES: Record<string, string> = {
  especes: 'Espèces',
  virement: 'Virement',
  en_ligne: 'Paiement en ligne',
  cheque: 'Chèque',
  mobile_money: 'Mobile money',
  acompte: 'Acompte de réservation',
};

export const DOCUMENT_TYPES: Record<string, string> = {
  bon_reservation: 'Bon de réservation',
  recu: 'Reçu de paiement',
  facture: 'Facture',
  contrat: 'Contrat',
  etat_paiement: 'État des paiements',
  justificatif: 'Justificatif',
  autre: 'Document',
};

/**
 * Missions de vérification foncière (J2.2). Le client suit l'avancement
 * dans ses mots à lui : « notre équipe est allée sur place », pas
 * `verification_physique`.
 */
export const MISSION_STATUS: Record<string, StatusLabel> = {
  demande: {
    label: 'Demande reçue',
    tone: 'info',
    help: 'Votre demande est enregistrée : nous la chiffrons et vous revenons vers vous.',
  },
  faisabilite: {
    label: 'Étude préalable',
    tone: 'info',
    help: 'Nous vérifions ce qu’il est possible de contrôler, et à quel coût.',
  },
  verification_physique: {
    label: 'Visite sur place',
    tone: 'primary',
    help: 'Notre équipe se rend sur le terrain pour constater la situation réelle.',
  },
  verification_administrative: {
    label: 'Contrôle administratif',
    tone: 'primary',
    help: 'Nous consultons les administrations compétentes sur ce terrain.',
  },
  rapport: {
    label: 'Rapport en cours',
    tone: 'warning',
    help: 'Les vérifications sont faites : nous rédigeons votre rapport.',
  },
  cloturee: {
    label: 'Terminée',
    tone: 'success',
    help: 'Votre rapport est disponible ci-dessous.',
  },
  abandonnee: {
    label: 'Interrompue',
    tone: 'neutral',
    help: 'Cette mission a été arrêtée : le motif vous a été communiqué.',
  },
};

/** Conclusion de MTM au terme de la mission. */
export const MISSION_DECISIONS: Record<string, StatusLabel> = {
  favorable: {
    label: 'Favorable',
    tone: 'success',
    help: 'Au vu de nos constats, rien ne s’oppose à votre achat.',
  },
  defavorable: {
    label: 'Défavorable',
    tone: 'accent',
    help: 'Nos constats vous déconseillent cet achat.',
  },
  a_completer: {
    label: 'À compléter',
    tone: 'warning',
    help: 'Des pièces ou des vérifications manquent pour conclure.',
  },
};

export const MISSION_TYPES: Record<string, string> = {
  verification_fonciere: 'Vérification foncière',
  verification_physique: 'Vérification physique',
  verification_administrative: 'Vérification administrative',
  accompagnement_achat: 'Accompagnement à l’achat',
  autre: 'Mission particulière',
};

export const MISSION_DOCUMENT_TYPES: Record<string, string> = {
  rapport: 'Rapport de vérification',
  piece_fournie: 'Pièce fournie',
  photo_visite: 'Photo de la visite',
  constat: 'Constat',
  piece_administrative: 'Pièce administrative',
  autre: 'Document',
};

const FALLBACK: StatusLabel = { label: '', tone: 'neutral', help: '' };

function humanize(code: string): string {
  const spaced = code.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function dossierStatus(code: string): StatusLabel {
  return DOSSIER_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function reservationStatus(code: string): StatusLabel {
  return RESERVATION_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function echeanceStatus(code: string): StatusLabel {
  return ECHEANCE_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function paymentMode(code: string): string {
  return PAYMENT_MODES[code] ?? humanize(code);
}

export function documentType(code: string): string {
  return DOCUMENT_TYPES[code] ?? humanize(code);
}

export function missionStatus(code: string): StatusLabel {
  return MISSION_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function missionDecision(code: string): StatusLabel {
  return MISSION_DECISIONS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function missionType(code: string): string {
  return MISSION_TYPES[code] ?? humanize(code);
}

export function missionDocumentType(code: string): string {
  return MISSION_DOCUMENT_TYPES[code] ?? humanize(code);
}
