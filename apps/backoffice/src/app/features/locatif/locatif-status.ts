export interface StatusMeaning {
  tone: 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  label: string;
  help: string;
}

/** Statut d'un bien (référentiel « locatif.statutsBien »). */
export const BIEN_STATUTS: Record<string, StatusMeaning> = {
  disponible: { tone: 'success', label: 'Disponible', help: 'Aucun bail actif : prêt à être loué.' },
  loue: { tone: 'primary', label: 'Loué', help: 'Un bail est en cours sur ce bien.' },
  en_travaux: { tone: 'warning', label: 'En travaux', help: 'Hors marché le temps des travaux.' },
  indisponible: { tone: 'neutral', label: 'Indisponible', help: 'Retiré du marché.' },
};

/** Statut d'un bail (référentiel « locatif.statutsBail »). */
export const BAIL_STATUTS: Record<string, StatusMeaning> = {
  actif: { tone: 'success', label: 'Actif', help: 'Bail en cours, sans préavis en cours.' },
  preavis: { tone: 'warning', label: 'Préavis donné', help: 'Le départ du locataire est annoncé.' },
  termine: { tone: 'neutral', label: 'Terminé', help: 'Sortie effectuée, dossier clos normalement.' },
  resilie_sans_preavis: {
    tone: 'danger',
    label: 'Résilié sans préavis',
    help: 'Départ constaté sans préavis (cas particulier).',
  },
};

/** Statut d'une échéance, recalculé automatiquement (jamais saisi à la main). */
export const ECHEANCE_STATUTS: Record<string, StatusMeaning> = {
  a_venir: { tone: 'neutral', label: 'À venir', help: 'Échéance future, non encore due.' },
  partielle: { tone: 'info', label: 'Partielle', help: 'Un règlement partiel a été reçu.' },
  en_retard: { tone: 'accent', label: 'En retard', help: 'Échéance dépassée, partiellement réglée.' },
  impayee: { tone: 'danger', label: 'Impayée', help: 'Échéance dépassée, rien n’a été réglé.' },
  payee: { tone: 'success', label: 'Payée', help: 'Échéance intégralement réglée.' },
  annulee: {
    tone: 'neutral',
    label: 'Annulée',
    help: 'Mois postérieur à la sortie du locataire : plus rien n’est dû.',
  },
};

/**
 * Situation de paiement d'un bail (référentiel « locatif.situationsPaiement »),
 * recalculée chaque nuit : c'est elle qui porte le cas « impayé prolongé » de
 * la section 15.
 */
export const SITUATIONS_PAIEMENT: Record<string, StatusMeaning> = {
  a_jour: { tone: 'success', label: 'À jour', help: 'Aucun loyer en retard sur ce bail.' },
  retard: { tone: 'warning', label: 'En retard', help: 'Au moins une échéance dépassée.' },
  impaye_prolonge: {
    tone: 'danger',
    label: 'Impayé prolongé',
    help: 'Le retard dépasse le seuil paramétré : dossier à traiter en priorité.',
  },
};

/** Contrôle des encaissements (section 24 : la permission « valider »). */
export const STATUTS_PAIEMENT: Record<string, StatusMeaning> = {
  en_attente: {
    tone: 'warning',
    label: 'À valider',
    help: 'Versement saisi : il ne compte dans le solde qu’une fois validé.',
  },
  valide: { tone: 'success', label: 'Validé', help: 'Encaissement contrôlé et imputé.' },
  rejete: { tone: 'danger', label: 'Rejeté', help: 'Versement refusé ou annulé.' },
};

/** Statut d'une relance de loyer. */
export const STATUTS_RELANCE: Record<string, StatusMeaning> = {
  a_envoyer: { tone: 'warning', label: 'À envoyer', help: 'Relance prête, en attente d’envoi.' },
  envoyee: { tone: 'success', label: 'Envoyée', help: 'Relance partie et tracée.' },
  annulee: { tone: 'neutral', label: 'Abandonnée', help: 'Relance devenue sans objet.' },
};

export const CAUTION_STATUTS: Record<string, StatusMeaning> = {
  non_versee: { tone: 'neutral', label: 'Non versée', help: 'Caution pas encore encaissée.' },
  partiellement_versee: {
    tone: 'warning',
    label: 'Partiellement versée',
    help: 'Une partie seulement de la caution prévue est encaissée.',
  },
  versee: { tone: 'success', label: 'Versée', help: 'Caution encaissée, en dépôt.' },
  partiellement_retenue: {
    tone: 'warning',
    label: 'Partiellement retenue',
    help: 'Une partie a été retenue à la sortie.',
  },
  retenue_totale: { tone: 'danger', label: 'Retenue en totalité', help: 'Caution intégralement retenue.' },
  remboursee: { tone: 'success', label: 'Remboursée', help: 'Caution restituée au locataire.' },
};

export const TYPES_BIEN: Record<string, string> = {
  villa: 'Villa',
  appartement: 'Appartement',
  studio: 'Studio',
  bureau: 'Bureau',
  commerce: 'Local commercial',
  autre: 'Autre',
};

export const TYPES_PAIEMENT: Record<string, string> = {
  avance: 'Avance',
  normal: 'Normal',
  partiel: 'Partiel',
  regularisation: 'Régularisation',
};

export const MODES_PAIEMENT: Record<string, string> = {
  especes: 'Espèces',
  virement: 'Virement',
  mobile_money: 'Mobile money',
  cheque: 'Chèque',
  autre: 'Autre',
};

/** Mouvements composant l'historique de caution (section 15). */
export const TYPES_MOUVEMENT_CAUTION: Record<string, string> = {
  versement: 'Versement',
  retenue: 'Retenue',
  remboursement: 'Remboursement',
  ajustement: 'Ajustement',
};

/** Nature d'un signalement : incident constaté ou demande du locataire. */
export const NATURES_SIGNALEMENT: Record<string, string> = {
  incident: 'Incident',
  demande: 'Demande',
};

export const TYPES_DEMANDE: Record<string, string> = {
  renouvellement_bail: 'Renouvellement du bail',
  attestation: 'Attestation',
  travaux: 'Travaux',
  depart: 'Départ',
  autre: 'Autre',
};

export const TYPES_INCIDENT: Record<string, string> = {
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  serrurerie: 'Serrurerie',
  autre: 'Autre',
};

export const STATUTS_INCIDENT: Record<string, StatusMeaning> = {
  signale: { tone: 'warning', label: 'Signalé', help: 'En attente de prise en charge.' },
  en_cours: { tone: 'info', label: 'En cours', help: 'Intervention planifiée ou en cours.' },
  resolu: { tone: 'success', label: 'Résolu', help: 'Incident réglé.' },
};

export const TYPES_DOCUMENT: Record<string, string> = {
  contrat: 'Contrat de bail',
  quittance: 'Quittance de loyer',
  etat_lieux_entree: 'État des lieux d’entrée',
  etat_lieux_sortie: 'État des lieux de sortie',
  releve_gestion: 'Relevé de gestion',
  rapport: 'Rapport',
  autre: 'Autre document',
};

export const MODELES_RELANCE: Record<string, string> = {
  rappel_amiable: 'Rappel amiable',
  relance_ferme: 'Relance ferme',
  mise_en_demeure: 'Mise en demeure',
};

/** Étapes après lesquelles un bail ne bouge plus. */
export const BAIL_STATUTS_TERMINES = ['termine', 'resilie_sans_preavis'];

export function label(map: Record<string, StatusMeaning>, value: string | null | undefined): string {
  return (value && map[value]?.label) || (value ?? '—');
}

export function help(map: Record<string, StatusMeaning>, value: string | null | undefined): string {
  return (value && map[value]?.help) || '';
}

export function pillClass(map: Record<string, StatusMeaning>, value: string | null | undefined): string {
  const tone = (value && map[value]?.tone) || 'neutral';
  return tone === 'neutral' ? 'status-pill' : `status-pill status-pill--${tone}`;
}

export function simpleLabel(map: Record<string, string>, value: string | null | undefined): string {
  return (value && map[value]) || (value ?? '—');
}

export function nomPersonne(
  personne: { firstName: string | null; lastName: string | null } | null,
): string {
  if (!personne) return '—';
  return [personne.firstName, personne.lastName].filter(Boolean).join(' ') || '—';
}

/**
 * Nom d'une personne présenté en capitales initiales : « modou faye » saisi à
 * la volée s'affiche « Modou Faye ». La donnée n'est pas modifiée, seule sa
 * lecture l'est — un portail remis au client ne peut pas afficher des noms en
 * minuscules. Les particules restent telles quelles (« el hadji », « van »),
 * chaque mot recevant la même règle.
 */
export function nomPropre(
  personne: { firstName: string | null; lastName: string | null } | null | undefined,
): string {
  if (!personne) return '—';
  const nom = [personne.firstName, personne.lastName].filter(Boolean).join(' ').trim();
  if (!nom) return '—';
  return nom.replace(
    /(^|[\s'’-])([\p{Ll}])/gu,
    (_, separateur: string, lettre: string) => separateur + lettre.toLocaleUpperCase('fr-FR'),
  );
}

/** Une échéance en retard ou impayée : ce qui justifie une relance. */
export function estARelancer(statut: string): boolean {
  return statut === 'en_retard' || statut === 'impayee';
}

/** Type de signalement : le référentiel dépend de sa nature (sections 4 et 15). */
export function typeSignalementLabel(nature: string, type: string): string {
  return nature === 'demande'
    ? simpleLabel(TYPES_DEMANDE, type)
    : simpleLabel(TYPES_INCIDENT, type);
}
