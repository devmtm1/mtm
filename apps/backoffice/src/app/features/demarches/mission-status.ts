import type { StatusChoice, StatusTone } from '../../shared/dialogs/status-choice-dialog';

export interface StatusMeaning {
  tone: StatusTone;
  label: string;
  help: string;
}

/**
 * Étapes d'une mission de vérification (référentiel « demarches.statuts »).
 * Les cinq étapes du cahier des charges, puis les deux fins possibles.
 */
export const MISSION_ETAPES: Record<string, StatusMeaning> = {
  demande: {
    tone: 'info',
    label: 'Demande reçue',
    help: 'Le client a formulé sa demande : à qualifier et à chiffrer.',
  },
  faisabilite: {
    tone: 'info',
    label: 'Étude de faisabilité',
    help: 'Étude préalable avant engagement complet : possible ou non, et à quel prix.',
  },
  verification_physique: {
    tone: 'primary',
    label: 'Vérification physique',
    help: 'Visite sur site : constat, photos, accès, environnement, GPS.',
  },
  verification_administrative: {
    tone: 'primary',
    label: 'Vérification administrative',
    help: 'Consultation des administrations compétentes selon la localité.',
  },
  rapport: {
    tone: 'warning',
    label: 'Rapport',
    help: 'Conclusion à rédiger et rapport à remettre au client.',
  },
  cloturee: {
    tone: 'success',
    label: 'Clôturée',
    help: 'Rapport remis et mission terminée.',
  },
  abandonnee: {
    tone: 'danger',
    label: 'Abandonnée',
    help: 'Mission interrompue : le motif reste sur la fiche.',
  },
};

/** Nature de la vérification demandée (référentiel « demarches.typesVerification »). */
export const TYPES_VERIFICATION: Record<string, StatusMeaning> = {
  verification_fonciere: {
    tone: 'primary',
    label: 'Vérification foncière',
    help: 'Contrôle complet : terrain et situation administrative.',
  },
  verification_physique: {
    tone: 'info',
    label: 'Vérification physique',
    help: 'Visite du terrain uniquement : constat sur place.',
  },
  verification_administrative: {
    tone: 'info',
    label: 'Vérification administrative',
    help: 'Contrôle des documents auprès des administrations.',
  },
  accompagnement_achat: {
    tone: 'success',
    label: 'Accompagnement à l’achat',
    help: 'Vérification puis accompagnement du client jusqu’à l’acquisition.',
  },
  autre: { tone: 'neutral', label: 'Autre', help: 'Mission particulière, à décrire dans l’objectif.' },
};

/** Urgence demandée par le client (référentiel « demarches.urgences »). */
export const URGENCES: Record<string, StatusMeaning> = {
  normale: { tone: 'neutral', label: 'Normale', help: 'Délai habituel de traitement.' },
  urgente: { tone: 'warning', label: 'Urgente', help: 'Le client a une échéance proche.' },
  tres_urgente: {
    tone: 'danger',
    label: 'Très urgente',
    help: 'À traiter en priorité : transaction imminente.',
  },
};

/** Décision de MTM au terme de la mission (section 14, étape 5). */
export const DECISIONS: Record<string, StatusMeaning> = {
  favorable: {
    tone: 'success',
    label: 'Favorable',
    help: 'Rien ne s’oppose à l’achat au vu des constats.',
  },
  defavorable: {
    tone: 'danger',
    label: 'Défavorable',
    help: 'MTM déconseille l’achat : les constats posent problème.',
  },
  a_completer: {
    tone: 'warning',
    label: 'À compléter',
    help: 'Des pièces ou des vérifications manquent pour conclure.',
  },
};

/** Ce que le collaborateur constate sur place (étape 3). */
export const CONFORMITES: Record<string, StatusMeaning> = {
  conforme: {
    tone: 'success',
    label: 'Conforme',
    help: 'Le terrain correspond aux informations fournies.',
  },
  ecart_mineur: {
    tone: 'warning',
    label: 'Écart mineur',
    help: 'Différence sans conséquence sur la transaction.',
  },
  ecart_majeur: {
    tone: 'danger',
    label: 'Écart majeur',
    help: 'Différence qui remet en cause l’opération.',
  },
  non_verifiable: {
    tone: 'neutral',
    label: 'Non vérifiable',
    help: 'Impossible de constater sur place (accès, occupation).',
  },
};

/** Administrations consultées (étape 4). */
export const ADMINISTRATIONS: Record<string, StatusMeaning> = {
  mairie: { tone: 'info', label: 'Mairie', help: 'Commune du lieu du terrain.' },
  service_domaines: {
    tone: 'info',
    label: 'Service des Domaines',
    help: 'Administration compétente sur le foncier de l’État.',
  },
  cadastre: { tone: 'info', label: 'Cadastre', help: 'Plans et références parcellaires.' },
  conservation_fonciere: {
    tone: 'info',
    label: 'Conservation foncière',
    help: 'Registre des titres fonciers.',
  },
  prefecture: { tone: 'info', label: 'Préfecture', help: 'Autorité administrative du département.' },
  sous_prefecture: {
    tone: 'info',
    label: 'Sous-préfecture',
    help: 'Autorité administrative de l’arrondissement.',
  },
  autre: { tone: 'neutral', label: 'Autre', help: 'Autre structure : à préciser.' },
};

/** Suite donnée par l'administration consultée. */
export const RESULTATS_ADMINISTRATION: Record<string, StatusMeaning> = {
  confirme: {
    tone: 'success',
    label: 'Information confirmée',
    help: 'L’administration confirme ce qui a été annoncé.',
  },
  infirme: {
    tone: 'danger',
    label: 'Information infirmée',
    help: 'L’administration contredit ce qui a été annoncé.',
  },
  partiel: {
    tone: 'warning',
    label: 'Confirmation partielle',
    help: 'Une partie seulement est confirmée.',
  },
  sans_reponse: { tone: 'neutral', label: 'Sans réponse', help: 'Aucune réponse obtenue.' },
  en_attente: { tone: 'neutral', label: 'En attente', help: 'Réponse annoncée mais pas encore reçue.' },
};

/** Types de pièces attachées à une mission. */
export const TYPES_DOCUMENT: Record<string, StatusMeaning> = {
  piece_fournie: {
    tone: 'neutral',
    label: 'Pièce fournie par le client',
    help: 'Document transmis par le demandeur.',
  },
  photo_visite: { tone: 'info', label: 'Photo de visite', help: 'Prise sur place lors du constat.' },
  constat: { tone: 'info', label: 'Constat', help: 'Document établi lors de la vérification.' },
  piece_administrative: {
    tone: 'primary',
    label: 'Pièce administrative',
    help: 'Document obtenu auprès d’une administration.',
  },
  rapport: { tone: 'success', label: 'Rapport de vérification', help: 'Le livrable remis au client.' },
  autre: { tone: 'neutral', label: 'Autre', help: 'Autre pièce du dossier.' },
};

/** Étapes après lesquelles la mission ne bouge plus. */
export const ETAPES_TERMINALES = ['cloturee', 'abandonnee'];

/** Constats saisissables sur une mission. */
export const TYPES_CONSTAT = [
  'verification_physique',
  'verification_administrative',
  'faisabilite',
];

export function label(
  map: Record<string, StatusMeaning>,
  value: string | null | undefined,
): string {
  return (value && map[value]?.label) || (value ?? '—');
}

export function help(
  map: Record<string, StatusMeaning>,
  value: string | null | undefined,
): string {
  return (value && map[value]?.help) || '';
}

export function pillClass(
  map: Record<string, StatusMeaning>,
  value: string | null | undefined,
): string {
  const tone = (value && map[value]?.tone) || 'neutral';
  return tone === 'neutral' ? 'status-pill' : `status-pill status-pill--${tone}`;
}

export function statusChoices(
  map: Record<string, StatusMeaning>,
  options: string[],
): StatusChoice[] {
  return options.map((value) => ({
    value,
    label: map[value]?.label ?? value,
    help: map[value]?.help ?? '',
    tone: map[value]?.tone ?? 'neutral',
  }));
}

/** Nom lisible d'un collaborateur, ou tiret quand la mission n'a pas de porteur. */
export function nomPersonne(
  personne: { firstName: string | null; lastName: string | null } | null,
): string {
  if (!personne) return '—';
  return [personne.firstName, personne.lastName].filter(Boolean).join(' ') || '—';
}

/** Une mission dont l'échéance est passée et qui n'est pas terminée. */
export function estEnRetard(mission: {
  dateEcheance: string | null;
  statut: string;
}): boolean {
  if (!mission.dateEcheance || ETAPES_TERMINALES.includes(mission.statut)) return false;
  return new Date(mission.dateEcheance).getTime() < Date.now();
}
