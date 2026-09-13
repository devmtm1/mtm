import type { StatusChoice, StatusTone } from '../../shared/dialogs/status-choice-dialog';
import type { ActiviteCrmItem } from '../../core/models/prospect.model';

export interface StatusMeaning {
  tone: StatusTone;
  label: string;
  help: string;
}

/** Étapes du pipeline commercial (référentiel « crm.pipelineStages »). */
export const PIPELINE: Record<string, StatusMeaning> = {
  nouveau_contact: { tone: 'info', label: 'Nouveau contact', help: 'Premier contact reçu : à qualifier rapidement.' },
  qualification: { tone: 'info', label: 'Qualification', help: 'Besoins, budget et délai sont en cours de précision.' },
  proposition: { tone: 'primary', label: 'Proposition', help: 'Un ou plusieurs terrains lui ont été proposés.' },
  visite: { tone: 'primary', label: 'Visite', help: 'Visite du terrain planifiée ou réalisée.' },
  negociation: { tone: 'warning', label: 'Négociation', help: 'Discussion sur le prix et les conditions.' },
  reservation: { tone: 'warning', label: 'Réservation', help: 'Acompte versé ou en cours : le terrain lui est bloqué.' },
  vente: { tone: 'success', label: 'Vente', help: 'Vente conclue : le prospect est devenu client.' },
  perdu: { tone: 'danger', label: 'Perdu', help: 'Abandon du projet : une justification est demandée.' },
};

export const ACTIVITY_TYPES: Record<string, StatusMeaning> = {
  appel: { tone: 'info', label: 'Appel', help: 'Appel téléphonique passé ou à passer.' },
  'rendez-vous': { tone: 'primary', label: 'Rendez-vous', help: 'Rencontre ou visite avec le prospect.' },
  tache: { tone: 'neutral', label: 'Tâche', help: 'Action interne à faire (envoyer un devis, préparer un dossier…).' },
  relance: { tone: 'warning', label: 'Relance', help: 'Reprendre contact après un silence.' },
  email: { tone: 'info', label: 'E-mail', help: 'Message envoyé ou à envoyer.' },
  note: { tone: 'neutral', label: 'Note', help: 'Information à retenir, sans action.' },
};

export const ACTIVITY_STATUS: Record<string, StatusMeaning> = {
  a_faire: { tone: 'warning', label: 'À faire', help: 'Pas encore réalisée.' },
  realise: { tone: 'success', label: 'Réalisée', help: 'Terminée.' },
  reporte: { tone: 'info', label: 'Reportée', help: 'Décalée à une autre date.' },
  annule: { tone: 'neutral', label: 'Annulée', help: 'Ne sera pas faite.' },
};

export const PRIORITIES: Record<string, StatusMeaning> = {
  basse: { tone: 'neutral', label: 'Basse', help: 'Peut attendre.' },
  moyenne: { tone: 'info', label: 'Moyenne', help: 'À faire dans la semaine.' },
  haute: { tone: 'danger', label: 'Haute', help: 'À traiter en priorité.' },
};

/** Origines de contact proposées (texte libre accepté). */
export const SOURCE_OPTIONS = ['Site web', 'Bouche-à-oreille', 'Réseaux sociaux', 'Panneau / affichage', 'Salon / événement', 'Recommandation client', 'Autre'];

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

export function statusChoices(map: Record<string, StatusMeaning>, options: string[]): StatusChoice[] {
  return options.map((value) => ({ value, label: map[value]?.label ?? value, help: map[value]?.help ?? '', tone: map[value]?.tone ?? 'neutral' }));
}

/** Une activité « à faire » dont l'échéance est passée. */
export function isOverdue(activite: Pick<ActiviteCrmItem, 'statut' | 'dateEcheance'>): boolean {
  if (activite.statut !== 'a_faire' || !activite.dateEcheance) return false;
  const end = new Date(activite.dateEcheance);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

/** Échéance en clair : « aujourd'hui », « dans 3 j », « en retard de 2 j ». */
export function dueLabel(dateEcheance: string | null): string {
  if (!dateEcheance) return 'Sans échéance';
  const end = new Date(dateEcheance);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Demain';
  if (days > 1) return `Dans ${days} j`;
  if (days === -1) return 'Hier';
  return `En retard de ${Math.abs(days)} j`;
}

export function prospectName(prospect: { nom: string; prenom: string | null }): string {
  return [prospect.prenom, prospect.nom].filter(Boolean).join(' ');
}
