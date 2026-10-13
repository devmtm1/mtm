import type { Activite, StatutOperation, TotauxFinanciers } from '../../core/services/api/finances-api.service';

export const ACTIVITES: { code: Activite; label: string }[] = [
  { code: 'vente', label: 'Vente de biens' },
  { code: 'locatif', label: 'Gestion locative' },
  { code: 'demarches', label: 'Démarches et vérifications' },
  { code: 'construction', label: 'Construction' },
  { code: 'general', label: 'Général (hors activité)' },
];

export const NATURES: Record<string, string> = {
  encaissement_vente: 'Encaissement de vente',
  commission_commercial: 'Commission de commercial',
  loyer: 'Loyer encaissé',
  sejour: 'Séjour encaissé',
  mission: 'Règlement de mission',
  frais_operateur: 'Frais de transfert',
  depense_chantier: 'Dépense de chantier',
  operation_recette: 'Recette saisie',
  operation_depense: 'Dépense saisie',
};

export const STATUTS_OPERATION: Record<StatutOperation, { label: string; tone: string }> = {
  en_attente: { label: 'À valider', tone: 'warning' },
  validee: { label: 'Validée', tone: 'success' },
  rejetee: { label: 'Rejetée', tone: 'danger' },
};

export function libelleActivite(code: string): string {
  return ACTIVITES.find((a) => a.code === code)?.label ?? code;
}

/** « 1 250 000 FCFA ». */
export function fcfa(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0')}\u00a0FCFA`;
}

/** Catégorie lisible : « loyer_bureaux » → « Loyer bureaux ». */
export function libelleCategorie(code: string): string {
  const texte = code.replace(/_/g, ' ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

export interface PeriodePreset {
  code: string;
  label: string;
  du: string;
  au: string;
}

function iso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const j = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${j}`;
}

/** Périodes proposées en un clic ; les dates sont des jours calendaires locaux, bornes incluses. */
export function presets(maintenant = new Date()): PeriodePreset[] {
  const annee = maintenant.getFullYear();
  const mois = maintenant.getMonth();
  const trimestre = Math.floor(mois / 3);
  return [
    { code: 'mois', label: 'Ce mois-ci', du: iso(new Date(annee, mois, 1)), au: iso(maintenant) },
    {
      code: 'mois-precedent',
      label: 'Mois précédent',
      du: iso(new Date(annee, mois - 1, 1)),
      au: iso(new Date(annee, mois, 0)),
    },
    { code: 'trimestre', label: 'Ce trimestre', du: iso(new Date(annee, trimestre * 3, 1)), au: iso(maintenant) },
    { code: 'annee', label: 'Cette année', du: iso(new Date(annee, 0, 1)), au: iso(maintenant) },
    { code: 'douze-mois', label: '12 derniers mois', du: iso(new Date(annee, mois - 11, 1)), au: iso(maintenant) },
  ];
}

/** Variation en pourcentage ; `null` quand il n'y a rien à comparer. */
export function variation(actuel: number, precedent: number): number | null {
  if (precedent === 0) return actuel === 0 ? 0 : null;
  return Math.round(((actuel - precedent) / Math.abs(precedent)) * 100);
}

export function variationDite(actuel: number, precedent: number): string {
  const v = variation(actuel, precedent);
  if (v === null) return 'nouveau';
  if (v === 0) return 'stable';
  return `${v > 0 ? '+' : ''}${v} %`;
}

/** La comparaison en une phrase : « +12 % par rapport à la période précédente », ou pourquoi il n'y en a pas. */
export function comparaisonDite(actuel: number, precedent: number): string {
  const v = variation(actuel, precedent);
  if (v === null) return 'Rien sur la période précédente : pas de comparaison';
  if (v === 0) return 'Stable par rapport à la période précédente';
  return `${v > 0 ? '+' : ''}${v} % par rapport à la période précédente`;
}

/** Part de chaque activité dans le revenu, pour le graphique ; ignore les activités sans revenu. */
export function repartitionRevenu(parActivite: (TotauxFinanciers & { activite: Activite })[]): { label: string; valeur: number }[] {
  return parActivite
    .filter((a) => a.revenu > 0)
    .map((a) => ({ label: libelleActivite(a.activite), valeur: a.revenu }));
}
