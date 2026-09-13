import type { StatusChoice, StatusTone } from '../../shared/dialogs/status-choice-dialog';

export interface StatusMeaning {
  tone: StatusTone;
  help: string;
}

/** Statuts du mandat (référentiel « mandats.statut », valeurs par défaut de l'API). */
export const MANDAT_STATUS: Record<string, StatusMeaning> = {
  Brouillon: { tone: 'neutral', help: 'Contrat en préparation : pas encore signé, aucune alerte.' },
  Actif: { tone: 'success', help: 'Contrat signé et en cours : MTM commercialise les lots.' },
  Expiré: { tone: 'warning', help: 'Date de fin dépassée : à renouveler ou à clôturer.' },
  Résilié: { tone: 'danger', help: 'Contrat rompu avant son terme, à l’initiative d’une des parties.' },
  Clôturé: { tone: 'primary', help: 'Mandat terminé normalement : lots vendus ou fin de contrat.' },
};

/** Statuts d'un lot (terrain rattaché au mandat). */
export const LOT_STATUS: Record<string, StatusMeaning> = {
  Confie: { tone: 'info', help: 'Terrain confié à MTM, pas encore mis en vente.' },
  Disponible: { tone: 'success', help: 'Proposé à la vente dans le cadre du mandat.' },
  Réservé: { tone: 'warning', help: 'Un dossier de vente est en cours.' },
  Vendu: { tone: 'primary', help: 'Vente conclue : compte dans le chiffre d’affaires du mandat.' },
};

export const LOT_STATUS_LABELS: Record<string, string> = { Confie: 'Confié' };

export const TYPE_MANDAT_HELP: Record<string, string> = {
  Vente: 'MTM est chargée de vendre les lots du propriétaire.',
  Location: 'MTM est chargée de louer les biens du propriétaire.',
  Gestion: 'MTM gère les biens pour le compte du propriétaire (gestion locative).',
};

/** Restrictions contractuelles proposées au formulaire (section 10 CDC). */
export const RESTRICTION_OPTIONS: { key: string; label: string; help: string }[] = [
  { key: 'interdictionVenteDirecte', label: 'Interdiction de vente directe', help: 'Le propriétaire ne peut pas vendre lui-même pendant la durée du mandat.' },
  { key: 'prixNonNegociable', label: 'Prix non négociable sans accord', help: 'Aucune remise sans validation écrite du propriétaire.' },
  { key: 'renouvellementTacite', label: 'Renouvellement tacite', help: 'Le mandat se prolonge automatiquement à l’échéance sauf dénonciation.' },
  { key: 'exclusiviteZone', label: 'Exclusivité sur la zone', help: 'Aucun autre intermédiaire ne peut intervenir sur ces biens.' },
];

export function statusChoices(map: Record<string, StatusMeaning>, options: string[], labels: Record<string, string> = {}): StatusChoice[] {
  return options.map((value) => ({ value, label: labels[value], help: map[value]?.help ?? '', tone: map[value]?.tone ?? 'neutral' }));
}

export function pillClass(map: Record<string, StatusMeaning>, value: string | null | undefined): string {
  const tone = (value && map[value]?.tone) || 'neutral';
  return tone === 'neutral' ? 'status-pill' : `status-pill status-pill--${tone}`;
}

export function statusHelp(map: Record<string, StatusMeaning>, value: string | null | undefined): string {
  return (value && map[value]?.help) || '';
}

export function lotLabel(value: string): string {
  return LOT_STATUS_LABELS[value] ?? value;
}

/** Jours restants avant la fin du mandat (négatif si dépassée). */
export function joursRestants(dateFin: string): number {
  const end = new Date(dateFin);
  end.setHours(23, 59, 59, 999);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

export interface EcheanceInfo {
  label: string;
  tone: StatusTone;
}

/** Délai d'alerte commun au bandeau « à renouveler » et aux tuiles (30 jours). */
export const ALERT_WINDOW_DAYS = 30;

/**
 * Lecture humaine de l'échéance. Le seuil d'alerte est le plus large entre
 * le délai propre au mandat et la fenêtre commune, pour que la liste et le
 * bandeau racontent la même chose.
 */
export function echeanceInfo(dateFin: string, statut: string, alerteJours: number | null): EcheanceInfo {
  if (statut !== 'Actif' && statut !== 'Brouillon') return { label: '—', tone: 'neutral' };
  const jours = joursRestants(dateFin);
  const seuil = Math.max(alerteJours ?? ALERT_WINDOW_DAYS, ALERT_WINDOW_DAYS);
  if (jours < 0) return { label: `Dépassée depuis ${Math.abs(jours)} j`, tone: 'danger' };
  if (jours === 0) return { label: 'Expire aujourd’hui', tone: 'danger' };
  if (jours <= seuil) return { label: `Expire dans ${jours} j`, tone: 'warning' };
  return { label: `${jours} j restants`, tone: 'neutral' };
}

/** Restrictions stockées en JSON → lignes lisibles. */
export function restrictionLines(value: Record<string, unknown> | null | undefined): string[] {
  if (!value) return [];
  const lines: string[] = [];
  for (const option of RESTRICTION_OPTIONS) {
    if (value[option.key] === true) lines.push(option.label);
  }
  const autres = value['autres'] ?? value['raw'];
  if (typeof autres === 'string' && autres.trim()) lines.push(autres.trim());
  for (const [key, item] of Object.entries(value)) {
    if (key === 'autres' || key === 'raw' || RESTRICTION_OPTIONS.some((option) => option.key === key)) continue;
    if (item === true) lines.push(key);
    else if (typeof item === 'string' && item.trim()) lines.push(`${key} : ${item}`);
  }
  return lines;
}
