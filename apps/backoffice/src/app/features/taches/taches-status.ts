import type { PersonneRef } from '../../core/services/api/taches-api.service';

export interface Libelle {
  label: string;
  /** Teinte de la pastille : neutral, info, success, warning, danger. */
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export const PRIORITES: Record<string, Libelle> = {
  basse: { label: 'Basse', tone: 'neutral' },
  moyenne: { label: 'Moyenne', tone: 'info' },
  haute: { label: 'Haute', tone: 'warning' },
  urgente: { label: 'Urgente', tone: 'danger' },
};

export const STATUTS: Record<string, Libelle> = {
  a_faire: { label: 'À faire', tone: 'neutral' },
  en_cours: { label: 'En cours', tone: 'info' },
  terminee: { label: 'Terminée', tone: 'success' },
  annulee: { label: 'Annulée', tone: 'neutral' },
};

export const TYPES_DOSSIER_LABELS: Record<string, string> = {
  prospect: 'Prospect',
  vente: 'Vente',
  mandat: 'Mandat',
  mission: 'Mission',
  bail: 'Bail',
  chantier: 'Chantier',
  terrain: 'Bien',
};

/** Route du back-office d'un dossier. */
export function routeDossier(type: string | null, id: string | null): string[] | null {
  if (!type || !id) return null;
  switch (type) {
    case 'prospect':
      return ['/crm/prospects', id];
    case 'vente':
      return ['/ventes', id];
    case 'mandat':
      return ['/mandats', id];
    case 'mission':
      return ['/demarches/missions', id];
    case 'chantier':
      return ['/construction/chantiers', id];
    case 'terrain':
      return ['/terrains', id];
    case 'bail':
      return ['/locatif/biens'];
    default:
      return null;
  }
}

export const ACTIONS_HISTORIQUE: Record<string, string> = {
  creee: 'Tâche créée',
  titre: 'Titre modifié',
  priorite: 'Priorité modifiée',
  echeance: 'Échéance modifiée',
  assignee: 'Tâche réassignée',
  statut: 'Statut modifié',
  commentaire: 'Commentaire',
};

export function libelle(table: Record<string, Libelle>, code: string | null | undefined): string {
  return (code && table[code]?.label) || code || '—';
}

export function pastille(table: Record<string, Libelle>, code: string | null | undefined): string {
  const tone = (code && table[code]?.tone) || 'neutral';
  return tone === 'neutral' ? 'status-pill' : `status-pill status-pill--${tone}`;
}

export function nomPersonne(personne: Pick<PersonneRef, 'firstName' | 'lastName'> | null | undefined): string {
  return [personne?.firstName, personne?.lastName].filter(Boolean).join(' ').trim() || '—';
}

/** « 12/10/2026 » ; vide si absent. */
export function dateCourte(valeur: string | null | undefined): string {
  if (!valeur) return '';
  return new Date(valeur).toLocaleDateString('fr-FR');
}

const JOUR = 24 * 3600 * 1000;

/** Échéance dite à l'oral : « en retard de 2 jours », « aujourd'hui », « demain », « dans 4 jours ». */
export function echeanceDite(valeur: string | null | undefined, maintenant = new Date()): string {
  if (!valeur) return 'Sans date limite';
  const echeance = new Date(valeur);
  const debutAujourdhui = new Date(maintenant);
  debutAujourdhui.setHours(0, 0, 0, 0);
  const debutEcheance = new Date(echeance);
  debutEcheance.setHours(0, 0, 0, 0);
  const ecart = Math.round((debutEcheance.getTime() - debutAujourdhui.getTime()) / JOUR);
  if (ecart < 0) return ecart === -1 ? 'En retard d’un jour' : `En retard de ${-ecart} jours`;
  if (ecart === 0) return 'Aujourd’hui';
  if (ecart === 1) return 'Demain';
  if (ecart < 8) return `Dans ${ecart} jours`;
  return dateCourte(valeur);
}

/** La teinte d'une échéance : rouge dépassée, orange le jour même, discrète sinon. */
export type UrgenceEcheance = 'sans' | 'retard' | 'aujourdhui' | 'bientot' | 'normal';

export function urgenceEcheance(valeur: string | null | undefined, maintenant = new Date()): UrgenceEcheance {
  if (!valeur) return 'sans';
  const debutAujourdhui = new Date(maintenant);
  debutAujourdhui.setHours(0, 0, 0, 0);
  const debutEcheance = new Date(valeur);
  debutEcheance.setHours(0, 0, 0, 0);
  const ecart = Math.round((debutEcheance.getTime() - debutAujourdhui.getTime()) / JOUR);
  if (ecart < 0) return 'retard';
  if (ecart === 0) return 'aujourdhui';
  return ecart <= 2 ? 'bientot' : 'normal';
}
