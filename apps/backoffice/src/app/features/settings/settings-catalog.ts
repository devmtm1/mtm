/**
 * Catalogue des paramètres connus de l'application : libellé, aide, type de
 * saisie et impact. Le back-office affiche « Durée de blocage d'une
 * réservation », pas `reservations.dureeBlocageJours`. Un paramètre absent
 * du catalogue reste modifiable dans « Autres paramètres ».
 */
export type SettingKind = 'text' | 'number' | 'list' | 'json';

export interface SettingSlot {
  key: string;
  label: string;
  help: string;
  kind: SettingKind;
  /** Unité affichée à côté d'un nombre. */
  unit?: string;
  /** Avertissement affiché avant modification (valeurs référencées ailleurs). */
  warning?: string;
}

export interface SettingGroup {
  id: string;
  title: string;
  help: string;
  slots: SettingSlot[];
}

const LIST_WARNING = 'Retirer une valeur encore utilisée par des fiches existantes peut les rendre impossibles à modifier. Ajoutez plutôt, renommez avec prudence.';

export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'general',
    title: 'Général',
    help: 'Identité de l’application.',
    slots: [{ key: 'app.name', label: 'Nom de l’application', help: 'Affiché dans l’en-tête et les documents générés.', kind: 'text' }],
  },
  {
    id: 'terrains',
    title: 'Terrains',
    help: 'Listes de valeurs proposées dans les fiches terrains.',
    slots: [
      { key: 'terrains.statutJuridique', label: 'Statuts juridiques', help: 'Titre foncier, bail, délibération… Une valeur par ligne, dans l’ordre proposé aux utilisateurs.', kind: 'list', warning: LIST_WARNING },
      { key: 'terrains.niveauVerification', label: 'Niveaux de vérification', help: 'Étapes de contrôle d’un terrain avant publication. Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'terrains.statutCommercial', label: 'Statuts de commercialisation', help: 'Disponible, Réservé, Vendu… Seul « Disponible » est publié sur le site. Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
    ],
  },
  {
    id: 'mandats',
    title: 'Mandats',
    help: 'Valeurs et règles des mandats de vente.',
    slots: [
      { key: 'mandats.typeMandat', label: 'Types de mandat', help: 'Simple, exclusif… Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'mandats.statut', label: 'Statuts de mandat', help: 'Cycle de vie d’un mandat. Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'mandats.statutLot', label: 'Statuts des lots', help: 'État de chaque terrain rattaché à un mandat. Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'mandats.documentTypes', label: 'Types de documents de mandat', help: 'Proposés lors de l’ajout d’un document. Une valeur par ligne.', kind: 'list' },
      { key: 'mandats.commissionRate', label: 'Taux de commission par défaut', help: 'Proposé à la création d’un mandat ; modifiable mandat par mandat.', kind: 'number', unit: '%' },
    ],
  },
  {
    id: 'crm',
    title: 'Prospects (CRM)',
    help: 'Pipeline commercial et actions de suivi.',
    slots: [
      { key: 'crm.pipelineStages', label: 'Étapes du pipeline', help: 'De « nouveau contact » à « vente » ou « perdu », dans l’ordre du parcours. Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'crm.activiteTypes', label: 'Types d’action', help: 'Appel, visite, relance… Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'crm.activiteStats', label: 'Statuts d’une action', help: 'À faire, faite, annulée… Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'crm.priorites', label: 'Priorités', help: 'Niveaux de priorité d’un prospect. Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'crm.documentTypes', label: 'Types de documents CRM', help: 'Proposés lors de l’ajout d’un document à un prospect. Une valeur par ligne.', kind: 'list' },
    ],
  },
  {
    id: 'ventes',
    title: 'Ventes, réservations & paiements',
    help: 'Règles du parcours de vente. Les valeurs techniques (en_cours, reserve…) sont traduites à l’écran par l’application.',
    slots: [
      { key: 'reservations.dureeBlocageJours', label: 'Durée de blocage d’une réservation', help: 'Nombre de jours pendant lesquels un terrain réservé reste bloqué avant expiration automatique.', kind: 'number', unit: 'jours' },
      { key: 'ventes.echeancesDefaut', label: 'Nombre d’échéances par défaut', help: 'Proposé à la création d’un dossier de vente pour découper le prix en versements.', kind: 'number', unit: 'échéances' },
      { key: 'paiements.modesAutorises', label: 'Modes de paiement autorisés', help: 'especes, virement, en_ligne… Une valeur par ligne.', kind: 'list', warning: LIST_WARNING },
      { key: 'ventes.reglesCommissions', label: 'Règles de commission', help: 'Règles appliquées au calcul de la commission d’un commercial (pourcentage, montant fixe, palier). Format technique : à modifier avec le développeur.', kind: 'json', warning: 'Une règle mal formée bloque le calcul des commissions.' },
      { key: 'ventes.statuts', label: 'Statuts des dossiers de vente', help: 'Valeurs techniques du cycle de vente. À ne modifier qu’avec le développeur.', kind: 'list', warning: 'Les écrans de vente reposent sur ces valeurs : ne les modifiez qu’avec le développeur.' },
      { key: 'ventes.transitions', label: 'Transitions autorisées', help: 'Depuis quel statut on peut passer à quel autre. Format technique : à modifier avec le développeur.', kind: 'json', warning: 'Une transition manquante empêche de faire avancer un dossier.' },
      { key: 'ventes.documentTypes', label: 'Types de documents de vente', help: 'Proposés lors de l’ajout d’un document à un dossier. Une valeur par ligne.', kind: 'list' },
    ],
  },
];

export function settingSlotByKey(key: string): SettingSlot | undefined {
  for (const group of SETTING_GROUPS) {
    const slot = group.slots.find((item) => item.key === key);
    if (slot) return slot;
  }
  return undefined;
}

/** Devine le type de saisie d'un paramètre hors catalogue d'après sa valeur. */
export function inferKind(value: unknown): SettingKind {
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return 'list';
  if (typeof value === 'string') return 'text';
  return 'json';
}
