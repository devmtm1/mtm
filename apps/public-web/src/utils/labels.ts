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

/**
 * Gestion locative (J2.1). Le locataire lit « Payée » ou « En retard »,
 * jamais `payee` ou `en_retard`. Nom distinct d'`ECHEANCE_STATUS` (ventes) :
 * les deux référentiels ne partagent pas les mêmes codes.
 */
export const LOYER_ECHEANCE_STATUS: Record<string, StatusLabel> = {
  a_venir: { label: 'À venir', tone: 'neutral', help: 'Échéance future, pas encore due.' },
  partielle: { label: 'Partielle', tone: 'info', help: 'Un règlement partiel a été reçu.' },
  en_retard: { label: 'En retard', tone: 'accent', help: 'Échéance dépassée : merci de régulariser.' },
  impayee: { label: 'Impayée', tone: 'accent', help: 'Échéance dépassée, rien n’a encore été réglé.' },
  payee: { label: 'Payée', tone: 'success', help: 'Échéance intégralement réglée.' },
};

/** Situation de paiement du bail : ce que le locataire doit lire en premier. */
export const SITUATION_PAIEMENT: Record<string, StatusLabel> = {
  a_jour: { label: 'À jour', tone: 'success', help: 'Aucun loyer en retard.' },
  retard: { label: 'Retard', tone: 'accent', help: 'Une échéance est dépassée.' },
  impaye_prolonge: {
    label: 'Impayé prolongé',
    tone: 'accent',
    help: 'Plusieurs semaines de retard : contactez-nous pour régulariser.',
  },
};

/** Statut d'un règlement reçu : acquis seulement après contrôle interne. */
export const PAIEMENT_STATUS: Record<string, StatusLabel> = {
  en_attente: {
    label: 'En cours de validation',
    tone: 'info',
    help: 'Votre règlement est enregistré et en cours de contrôle.',
  },
  valide: { label: 'Validé', tone: 'success', help: 'Règlement contrôlé et imputé.' },
  rejete: { label: 'Rejeté', tone: 'accent', help: 'Ce règlement n’a pas pu être retenu.' },
};

/** Caution : statut déduit des mouvements (section 15). */
export const CAUTION_STATUS: Record<string, StatusLabel> = {
  non_versee: { label: 'Non versée', tone: 'neutral', help: 'Caution pas encore encaissée.' },
  partiellement_versee: {
    label: 'Partiellement versée',
    tone: 'warning',
    help: 'Une partie de la caution reste à verser.',
  },
  versee: { label: 'Versée', tone: 'success', help: 'Caution encaissée et conservée en dépôt.' },
  partiellement_retenue: {
    label: 'Partiellement retenue',
    tone: 'warning',
    help: 'Une partie a été retenue, le reste vous a été restitué.',
  },
  retenue_totale: { label: 'Retenue', tone: 'accent', help: 'Caution intégralement retenue.' },
  remboursee: { label: 'Remboursée', tone: 'success', help: 'Caution restituée.' },
};

export const MOUVEMENT_CAUTION_TYPES: Record<string, string> = {
  versement: 'Versement',
  retenue: 'Retenue',
  remboursement: 'Remboursement',
  ajustement: 'Ajustement',
};

/** Demandes du locataire (sections 4 et 15). */
export const DEMANDE_TYPES: Record<string, string> = {
  renouvellement_bail: 'Renouvellement du bail',
  attestation: 'Attestation',
  travaux: 'Travaux',
  depart: 'Départ',
  autre: 'Autre',
};

export const BAIL_STATUS: Record<string, StatusLabel> = {
  actif: { label: 'En cours', tone: 'success', help: 'Votre bail est actif.' },
  preavis: { label: 'Préavis en cours', tone: 'warning', help: 'Votre départ est enregistré.' },
  termine: { label: 'Terminé', tone: 'neutral', help: 'Ce bail est clôturé.' },
  resilie_sans_preavis: { label: 'Résilié', tone: 'accent', help: 'Ce bail a été résilié.' },
};

export const INCIDENT_STATUS: Record<string, StatusLabel> = {
  signale: { label: 'Signalé', tone: 'warning', help: 'En attente de prise en charge.' },
  en_cours: { label: 'En cours', tone: 'info', help: 'Intervention en cours.' },
  resolu: { label: 'Résolu', tone: 'success', help: 'Incident réglé.' },
};

export const INCIDENT_TYPES: Record<string, string> = {
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  serrurerie: 'Serrurerie',
  autre: 'Autre',
};

export const LOCATIF_DOCUMENT_TYPES: Record<string, string> = {
  contrat: 'Contrat de bail',
  quittance: 'Quittance de loyer',
  etat_lieux_entree: 'État des lieux d’entrée',
  etat_lieux_sortie: 'État des lieux de sortie',
  releve_gestion: 'Relevé de gestion',
  rapport: 'Rapport',
  autre: 'Document',
};

/** Statut commercial d'un bien, côté propriétaire. */
export const BIEN_LOCATIF_STATUS: Record<string, StatusLabel> = {
  disponible: { label: 'Disponible', tone: 'info', help: 'Aucun locataire en place.' },
  loue: { label: 'Loué', tone: 'success', help: 'Un bail est en cours.' },
  en_travaux: { label: 'En travaux', tone: 'warning', help: 'Hors location le temps des travaux.' },
  indisponible: { label: 'Indisponible', tone: 'neutral', help: 'Retiré de la location.' },
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

export function loyerEcheanceStatus(code: string): StatusLabel {
  return LOYER_ECHEANCE_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function bailStatus(code: string): StatusLabel {
  return BAIL_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function incidentStatus(code: string): StatusLabel {
  return INCIDENT_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function incidentType(code: string): string {
  return INCIDENT_TYPES[code] ?? humanize(code);
}

export function locatifDocumentType(code: string): string {
  return LOCATIF_DOCUMENT_TYPES[code] ?? humanize(code);
}

export function situationPaiement(code: string): StatusLabel {
  return SITUATION_PAIEMENT[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function paiementStatus(code: string): StatusLabel {
  return PAIEMENT_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function cautionStatus(code: string): StatusLabel {
  return CAUTION_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function mouvementCautionType(code: string): string {
  return MOUVEMENT_CAUTION_TYPES[code] ?? humanize(code);
}

export function demandeType(code: string): string {
  return DEMANDE_TYPES[code] ?? humanize(code);
}

export function bienLocatifStatus(code: string): StatusLabel {
  return BIEN_LOCATIF_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

/** Un signalement n'a pas le même référentiel de types selon sa nature. */
export function signalementType(nature: string, code: string): string {
  return nature === 'demande' ? demandeType(code) : incidentType(code);
}

/**
 * Suivi de chantier (J2.3, section 16). Le client lit « Gros œuvre en
 * cours », jamais `en_cours` : mêmes libellés que le back-office, mais
 * formulés de son point de vue — il suit son chantier, il ne le pilote pas.
 */
export const CHANTIER_STATUS: Record<string, StatusLabel> = {
  prepare: {
    label: 'En préparation',
    tone: 'info',
    help: 'Devis, budget et planning se mettent en place : les travaux n’ont pas encore démarré.',
  },
  en_cours: {
    label: 'Travaux en cours',
    tone: 'primary',
    help: 'Le chantier avance ; les journées publiées vous en rendent compte.',
  },
  suspendu: {
    label: 'Suspendu',
    tone: 'warning',
    help: 'Les travaux sont à l’arrêt. Votre conseiller vous en explique la raison.',
  },
  receptionne: {
    label: 'Réceptionné',
    tone: 'success',
    help: 'Les travaux sont achevés et la réception a été prononcée.',
  },
  cloture: {
    label: 'Clôturé',
    tone: 'success',
    help: 'Le dossier est soldé.',
  },
  abandonne: {
    label: 'Abandonné',
    tone: 'neutral',
    help: 'Le projet a été interrompu avant son terme.',
  },
};

export const CHANTIER_JALON_STATUS: Record<string, StatusLabel> = {
  a_venir: { label: 'À venir', tone: 'neutral', help: 'Cette étape n’a pas encore commencé.' },
  en_cours: { label: 'En cours', tone: 'primary', help: 'Étape en travaux.' },
  termine: { label: 'Terminée', tone: 'success', help: 'Étape achevée.' },
  bloque: { label: 'Bloquée', tone: 'warning', help: 'Étape empêchée : une décision est attendue.' },
  annule: { label: 'Annulée', tone: 'neutral', help: 'Étape retirée du programme.' },
};

export const CHANTIER_TYPES: Record<string, string> = {
  villa: 'Villa',
  immeuble: 'Immeuble',
  local_commercial: 'Local commercial',
  cloture: 'Clôture',
  renovation: 'Rénovation',
  viabilisation: 'Viabilisation',
  autre: 'Autre',
};

export const CHANTIER_DOCUMENT_TYPES: Record<string, string> = {
  plan: 'Plan',
  permis_construire: 'Permis de construire',
  devis: 'Devis',
  contrat: 'Contrat',
  facture: 'Facture',
  photo_chantier: 'Photo de chantier',
  proces_verbal: 'Procès-verbal',
  rapport_avancement: 'Rapport d’avancement',
  autre: 'Autre',
};

export function chantierStatus(code: string): StatusLabel {
  return CHANTIER_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function chantierJalonStatus(code: string): StatusLabel {
  return CHANTIER_JALON_STATUS[code] ?? { ...FALLBACK, label: humanize(code) };
}

export function chantierType(code: string): string {
  return CHANTIER_TYPES[code] ?? humanize(code);
}

export function chantierDocumentType(code: string): string {
  return CHANTIER_DOCUMENT_TYPES[code] ?? humanize(code);
}
