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
