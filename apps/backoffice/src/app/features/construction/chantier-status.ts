import type {
  StatusChoice,
  StatusTone,
} from '../../shared/dialogs/status-choice-dialog';

export interface StatusMeaning {
  tone: StatusTone;
  label: string;
  help: string;
}

/**
 * Vocabulaire d'affichage du suivi de chantier (J2.3, section 16 CDC).
 *
 * Les codes viennent des référentiels paramétrables de l'API ; ce fichier ne
 * fait que leur donner un libellé, une couleur et une phrase d'aide. Un code
 * ajouté dans les Paramètres s'affiche donc tel quel plutôt que de casser
 * l'écran — c'est ce que garantit `label()`.
 */

/** Cycle de vie d'un chantier (référentiel « construction.statuts »). */
export const STATUTS_CHANTIER: Record<string, StatusMeaning> = {
  prepare: {
    tone: 'info',
    label: 'En préparation',
    help: 'Devis, budget et planning se mettent en place : les travaux n’ont pas commencé.',
  },
  en_cours: {
    tone: 'primary',
    label: 'En cours',
    help: 'Les travaux sont engagés et le journal se tient au quotidien.',
  },
  suspendu: {
    tone: 'warning',
    label: 'Suspendu',
    help: 'Chantier à l’arrêt : le motif reste sur la fiche.',
  },
  receptionne: {
    tone: 'success',
    label: 'Réceptionné',
    help: 'Travaux achevés et réception prononcée.',
  },
  cloture: {
    tone: 'success',
    label: 'Clôturé',
    help: 'Dossier soldé : plus aucun mouvement attendu.',
  },
  abandonne: {
    tone: 'danger',
    label: 'Abandonné',
    help: 'Projet interrompu avant son terme.',
  },
};

/** Statuts après lesquels un chantier ne bouge plus et n’alerte plus. */
export const STATUTS_TERMINES = ['receptionne', 'cloture', 'abandonne'];

/** Nature de l'ouvrage (référentiel « construction.typesProjet »). */
export const TYPES_PROJET: Record<string, StatusMeaning> = {
  villa: { tone: 'primary', label: 'Villa', help: 'Maison individuelle.' },
  immeuble: {
    tone: 'primary',
    label: 'Immeuble',
    help: 'Bâtiment collectif, plusieurs niveaux.',
  },
  local_commercial: {
    tone: 'info',
    label: 'Local commercial',
    help: 'Boutique, bureau ou entrepôt.',
  },
  cloture: {
    tone: 'neutral',
    label: 'Clôture',
    help: 'Mur de clôture et sécurisation d’un terrain.',
  },
  renovation: {
    tone: 'info',
    label: 'Rénovation',
    help: 'Reprise d’un bâtiment existant.',
  },
  viabilisation: {
    tone: 'neutral',
    label: 'Viabilisation',
    help: 'Voirie et réseaux avant construction.',
  },
  autre: { tone: 'neutral', label: 'Autre', help: '' },
};

/** État d'un jalon du planning (référentiel « construction.statutsJalon »). */
export const STATUTS_JALON: Record<string, StatusMeaning> = {
  a_venir: {
    tone: 'neutral',
    label: 'À venir',
    help: 'Pas encore démarré.',
  },
  en_cours: {
    tone: 'primary',
    label: 'En cours',
    help: 'Travaux engagés sur cette étape.',
  },
  termine: {
    tone: 'success',
    label: 'Terminé',
    help: 'Étape achevée : elle compte pour 100 % dans l’avancement.',
  },
  bloque: {
    tone: 'danger',
    label: 'Bloqué',
    help: 'Étape empêchée : une décision est attendue.',
  },
  annule: {
    tone: 'neutral',
    label: 'Annulé',
    help: 'Étape retirée du programme : elle ne compte plus dans l’avancement.',
  },
};

/** Synthèse d'alerte stockée sur le chantier, pour trier la liste. */
export const SITUATIONS_ALERTE: Record<string, StatusMeaning> = {
  aucune: {
    tone: 'success',
    label: 'Dans les clous',
    help: 'Ni retard constaté, ni budget dépassé.',
  },
  retard: {
    tone: 'warning',
    label: 'En retard',
    help: 'La fin prévue est dépassée, ou des jalons ont passé leur échéance.',
  },
  depassement_budget: {
    tone: 'warning',
    label: 'Budget dépassé',
    help: 'Les dépenses validées ont franchi le seuil paramétré.',
  },
  retard_et_depassement: {
    tone: 'danger',
    label: 'Retard et budget',
    help: 'Le chantier dérape à la fois sur les délais et sur l’argent.',
  },
};

/** Situation contractuelle d'un prestataire. */
export const STATUTS_INTERVENANT: Record<string, StatusMeaning> = {
  pressenti: {
    tone: 'neutral',
    label: 'Pressenti',
    help: 'Contact pris, rien de signé : son montant n’engage pas le budget.',
  },
  engage: {
    tone: 'primary',
    label: 'Engagé',
    help: 'Contrat signé : son montant entre dans les engagements.',
  },
  en_cours: {
    tone: 'primary',
    label: 'En intervention',
    help: 'Présent sur le chantier.',
  },
  termine: {
    tone: 'success',
    label: 'Terminé',
    help: 'Prestation achevée.',
  },
  resilie: {
    tone: 'danger',
    label: 'Résilié',
    help: 'Contrat rompu : son montant sort des engagements.',
  },
};

/** Corps de métier (référentiel « construction.metiers »). */
export const METIERS: Record<string, StatusMeaning> = {
  maconnerie: { tone: 'neutral', label: 'Maçonnerie', help: '' },
  terrassement: { tone: 'neutral', label: 'Terrassement', help: '' },
  ferraillage: { tone: 'neutral', label: 'Ferraillage', help: '' },
  charpente: { tone: 'neutral', label: 'Charpente', help: '' },
  electricite: { tone: 'neutral', label: 'Électricité', help: '' },
  plomberie: { tone: 'neutral', label: 'Plomberie', help: '' },
  menuiserie: { tone: 'neutral', label: 'Menuiserie', help: '' },
  peinture: { tone: 'neutral', label: 'Peinture', help: '' },
  carrelage: { tone: 'neutral', label: 'Carrelage', help: '' },
  etudes: { tone: 'info', label: 'Études', help: 'Architecte, bureau d’études.' },
  controle: {
    tone: 'info',
    label: 'Contrôle',
    help: 'Bureau de contrôle technique.',
  },
  autre: { tone: 'neutral', label: 'Autre', help: '' },
};

/** Postes du budget prévisionnel. */
export const POSTES_BUDGET: Record<string, StatusMeaning> = {
  materiaux: { tone: 'primary', label: 'Matériaux', help: '' },
  main_oeuvre: { tone: 'info', label: 'Main-d’œuvre', help: '' },
  equipement: { tone: 'neutral', label: 'Équipement', help: 'Location d’engins, outillage.' },
  etudes: { tone: 'neutral', label: 'Études', help: '' },
  administratif: {
    tone: 'neutral',
    label: 'Administratif',
    help: 'Permis, taxes, formalités.',
  },
  divers: { tone: 'neutral', label: 'Divers', help: '' },
};

/** Contrôle comptable d'une dépense. */
export const STATUTS_DEPENSE: Record<string, StatusMeaning> = {
  en_attente: {
    tone: 'warning',
    label: 'À contrôler',
    help: 'Saisie sur le chantier : elle ne pèse pas encore sur le budget.',
  },
  valide: {
    tone: 'success',
    label: 'Validée',
    help: 'Contrôlée par la comptabilité : elle compte dans le budget consommé.',
  },
  rejete: {
    tone: 'danger',
    label: 'Rejetée',
    help: 'Refusée au contrôle : le motif est sur la ligne.',
  },
};

/** Conditions du jour notées au journal. */
export const METEOS: Record<string, StatusMeaning> = {
  ensoleille: { tone: 'neutral', label: 'Ensoleillé', help: '' },
  nuageux: { tone: 'neutral', label: 'Nuageux', help: '' },
  pluie: { tone: 'info', label: 'Pluie', help: '' },
  vent: { tone: 'info', label: 'Vent', help: '' },
  intemperies: {
    tone: 'warning',
    label: 'Intempéries',
    help: 'Conditions ayant empêché ou ralenti les travaux.',
  },
};

/** Types de pièces attachées à un chantier. */
export const TYPES_DOCUMENT: Record<string, StatusMeaning> = {
  plan: { tone: 'neutral', label: 'Plan', help: '' },
  permis_construire: {
    tone: 'info',
    label: 'Permis de construire',
    help: '',
  },
  devis: { tone: 'neutral', label: 'Devis', help: '' },
  contrat: { tone: 'neutral', label: 'Contrat', help: '' },
  facture: { tone: 'neutral', label: 'Facture', help: '' },
  photo_chantier: { tone: 'neutral', label: 'Photo', help: '' },
  proces_verbal: { tone: 'info', label: 'Procès-verbal', help: '' },
  rapport_avancement: {
    tone: 'primary',
    label: 'Rapport d’avancement',
    help: 'Document remis au client.',
  },
  autre: { tone: 'neutral', label: 'Autre', help: '' },
};

/** Modes de règlement des dépenses. */
export const MODES_PAIEMENT: Record<string, StatusMeaning> = {
  especes: { tone: 'neutral', label: 'Espèces', help: '' },
  virement: { tone: 'neutral', label: 'Virement', help: '' },
  mobile_money: { tone: 'neutral', label: 'Mobile money', help: '' },
  cheque: { tone: 'neutral', label: 'Chèque', help: '' },
  autre: { tone: 'neutral', label: 'Autre', help: '' },
};

/** Vues rapides du service construction : ce qu'on regarde en premier. */
export const VUES_RAPIDES = [
  {
    value: 'en_cours',
    label: 'Chantiers actifs',
    help: 'Tout ce qui n’est ni réceptionné, ni clôturé, ni abandonné.',
  },
  {
    value: 'en_retard',
    label: 'En retard',
    help: 'Fin prévue dépassée, ou jalons échus non terminés.',
  },
  {
    value: 'budget_depasse',
    label: 'Budget dépassé',
    help: 'Dépenses validées au-delà du seuil paramétré.',
  },
  {
    value: 'sans_responsable',
    label: 'Sans responsable',
    help: 'Personne ne conduit le chantier : à affecter.',
  },
  {
    value: 'a_receptionner',
    label: 'À réceptionner',
    help: 'Planning soldé à 100 % mais réception non prononcée.',
  },
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
  return tone === 'neutral'
    ? 'status-pill'
    : `status-pill status-pill--${tone}`;
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

/** Nom lisible d'un collaborateur, ou tiret quand le chantier n'a pas de porteur. */
export function nomPersonne(
  personne: { firstName: string | null; lastName: string | null } | null,
): string {
  if (!personne) return '—';
  return (
    [personne.firstName, personne.lastName].filter(Boolean).join(' ') || '—'
  );
}

/** Un chantier dont la fin prévue est passée et qui n'est pas terminé. */
export function estEnRetard(chantier: {
  dateFinPrevue: string | null;
  statut: string;
}): boolean {
  if (!chantier.dateFinPrevue || STATUTS_TERMINES.includes(chantier.statut)) {
    return false;
  }
  return new Date(chantier.dateFinPrevue).getTime() < Date.now();
}

/**
 * Classe de la barre d'avancement. Un chantier en retard se signale sur sa
 * barre : c'est là que l'œil se pose, pas sur la pastille de statut.
 */
export function tonAvancement(chantier: {
  situationAlerte: string;
  statut: string;
}): string {
  if (STATUTS_TERMINES.includes(chantier.statut)) return 'progress--done';
  if (chantier.situationAlerte === 'retard_et_depassement') {
    return 'progress--danger';
  }
  if (chantier.situationAlerte !== 'aucune') return 'progress--warning';
  return '';
}

/** Les montants arrivent en Decimal sérialisé : « 1500000.00 ». */
export function montant(valeur: number | string | null | undefined): number {
  if (valeur === null || valeur === undefined) return 0;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}
