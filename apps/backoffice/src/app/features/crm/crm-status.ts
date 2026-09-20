import type { StatusChoice, StatusTone } from '../../shared/dialogs/status-choice-dialog';
import type { ActiviteCrmItem } from '../../core/models/prospect.model';

export interface StatusMeaning {
  tone: StatusTone;
  label: string;
  help: string;
}

/** Parcours commercial MTM (référentiel « crm.pipelineStages »). */
export const PIPELINE: Record<string, StatusMeaning> = {
  nouveau: { tone: 'info', label: 'Nouveau', help: 'Prospect enregistré : à contacter rapidement.' },
  contacte: { tone: 'info', label: 'Contacté', help: 'Premier échange réalisé, besoin pas encore précisé.' },
  qualifie: { tone: 'primary', label: 'Qualifié', help: 'Zone, surface, budget et objectif sont connus.' },
  visite_programmee: { tone: 'primary', label: 'Visite programmée', help: 'Un rendez-vous de visite est fixé.' },
  visite_effectuee: { tone: 'primary', label: 'Visite effectuée', help: 'La visite a eu lieu : saisir le retour du client.' },
  en_reflexion: { tone: 'warning', label: 'En réflexion', help: 'Le client réfléchit : garder le contact.' },
  a_relancer: { tone: 'warning', label: 'À relancer', help: 'Sans nouvelle : relance à programmer.' },
  negociation: { tone: 'warning', label: 'Négociation', help: 'Discussion sur le prix et les conditions.' },
  reservation: { tone: 'warning', label: 'Réservation', help: 'Acompte versé ou en cours : le terrain lui est bloqué.' },
  vente: { tone: 'success', label: 'Vente conclue', help: 'Vente conclue : le prospect est devenu client.' },
  refuse: { tone: 'danger', label: 'Refusé', help: 'Le client ne donne pas suite : motif obligatoire.' },
  abandonne: { tone: 'danger', label: 'Projet abandonné', help: 'Le projet est abandonné : motif obligatoire.' },
  injoignable: { tone: 'danger', label: 'Injoignable', help: 'Plus aucun contact possible : motif obligatoire.' },
};

/** Sources d'acquisition (référentiel « crm.sourcesAcquisition »). */
export const SOURCES: Record<string, StatusMeaning> = {
  facebook: { tone: 'info', label: 'Facebook', help: 'Publication ou publicité Facebook.' },
  tiktok: { tone: 'info', label: 'TikTok', help: 'Vidéo TikTok.' },
  instagram: { tone: 'info', label: 'Instagram', help: 'Publication Instagram.' },
  whatsapp: { tone: 'success', label: 'WhatsApp', help: 'Message reçu sur WhatsApp.' },
  site: { tone: 'primary', label: 'Site web', help: 'Formulaire du site MTM.' },
  recommandation: { tone: 'success', label: 'Recommandation', help: 'Recommandé par un client ou un partenaire.' },
  autre: { tone: 'neutral', label: 'Autre', help: 'Autre canal : à préciser dans les notes.' },
  contact_public: { tone: 'primary', label: 'Site web', help: 'Message reçu depuis le site public.' },
};

/** Niveau d'intérêt du prospect (référentiel « crm.niveauxInteret »). */
export const INTEREST_LEVELS: Record<string, StatusMeaning> = {
  faible: { tone: 'neutral', label: 'Faible', help: 'Se renseigne, sans projet arrêté.' },
  moyen: { tone: 'info', label: 'Moyen', help: 'Projet réel, échéance lointaine.' },
  fort: { tone: 'warning', label: 'Fort', help: 'Projet précis, cherche activement.' },
  tres_interesse: { tone: 'success', label: 'Très intéressé', help: 'Prêt à visiter ou à réserver.' },
};

/** Moyen du premier contact. */
export const CONTACT_CHANNELS: Record<string, StatusMeaning> = {
  appel: { tone: 'info', label: 'Appel', help: 'Appel téléphonique.' },
  whatsapp: { tone: 'success', label: 'WhatsApp', help: 'Échange WhatsApp.' },
  message: { tone: 'info', label: 'Message', help: 'SMS ou message écrit.' },
  visite_agence: { tone: 'primary', label: 'Visite en agence', help: 'Le client est passé à l’agence.' },
  autre: { tone: 'neutral', label: 'Autre', help: 'Autre moyen de contact.' },
};

/** Objectif de l'achat. */
export const PURCHASE_GOALS: Record<string, StatusMeaning> = {
  habitation: { tone: 'primary', label: 'Habitation', help: 'Pour y construire sa maison.' },
  investissement: { tone: 'info', label: 'Investissement', help: 'Placement ou revente.' },
  autre: { tone: 'neutral', label: 'Autre', help: 'Autre usage : à préciser.' },
};

/** Statut d'une proposition de terrain (§ 3 de la fiche de suivi). */
export const VISITE_STATUS: Record<string, StatusMeaning> = {
  proposee: { tone: 'info', label: 'Terrain proposé', help: 'Terrain présenté au client, pas encore de rendez-vous.' },
  programmee: { tone: 'warning', label: 'Visite programmée', help: 'Rendez-vous fixé avec le client.' },
  effectuee: { tone: 'success', label: 'Visite effectuée', help: 'La visite a eu lieu.' },
  annulee: { tone: 'danger', label: 'Non effectuée', help: 'Visite annulée, reportée ou client injoignable.' },
};

/** Motif d'une visite non effectuée. */
export const VISITE_CANCEL_REASONS: Record<string, StatusMeaning> = {
  indisponible: { tone: 'warning', label: 'Client indisponible', help: 'Le client n’était pas disponible.' },
  reportee: { tone: 'info', label: 'Reportée', help: 'Reportée à une date ultérieure.' },
  annulee: { tone: 'danger', label: 'Annulée', help: 'Annulée par le client.' },
  injoignable: { tone: 'danger', label: 'Injoignable', help: 'Client injoignable le jour du rendez-vous.' },
  autre: { tone: 'neutral', label: 'Autre', help: 'Autre motif.' },
};

/** Appréciation du terrain après la visite. */
export const VISITE_FEEDBACK: Record<string, StatusMeaning> = {
  oui_beaucoup: { tone: 'success', label: 'Oui, beaucoup', help: 'Le terrain plaît nettement.' },
  oui_hesitation: { tone: 'warning', label: 'Oui, avec hésitation', help: 'Plaît, mais un point bloque.' },
  moyennement: { tone: 'warning', label: 'Moyennement', help: 'Réserves importantes.' },
  non: { tone: 'danger', label: 'Non', help: 'Le terrain ne convient pas.' },
};

/** Position du client sur le prix. */
export const PRICE_FEEDBACK: Record<string, StatusMeaning> = {
  oui: { tone: 'success', label: 'Prix accepté', help: 'Le client accepte le prix affiché.' },
  non: { tone: 'danger', label: 'Prix refusé', help: 'Le prix est un obstacle.' },
  negociation_demandee: { tone: 'warning', label: 'Négociation demandée', help: 'Le client demande un geste sur le prix.' },
};

/** Objection principale relevée après la visite (référentiel « crm.objections »). */
export const OBJECTIONS: Record<string, StatusMeaning> = {
  prix: { tone: 'danger', label: 'Prix', help: 'Trop cher par rapport au budget.' },
  emplacement: { tone: 'warning', label: 'Emplacement', help: 'Quartier ou zone qui ne convient pas.' },
  distance: { tone: 'warning', label: 'Distance', help: 'Trop loin du travail ou de la famille.' },
  environnement: { tone: 'warning', label: 'Environnement', help: 'Voisinage, accès, nuisances.' },
  documents: { tone: 'danger', label: 'Documents', help: 'Doute sur le statut juridique du terrain.' },
  surface: { tone: 'warning', label: 'Surface', help: 'Trop petit ou trop grand.' },
  delais: { tone: 'info', label: 'Délais', help: 'Le calendrier ne convient pas.' },
  autre: { tone: 'neutral', label: 'Autre', help: 'Autre objection : voir les commentaires.' },
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

/** Sorties du parcours : un motif est exigé (règle de gestion du CRM). */
export const EXIT_STAGES = ['refuse', 'abandonne', 'injoignable'];

/** Étapes de fin de parcours : plus de relance attendue. */
export const CLOSED_STAGES = ['vente', ...EXIT_STAGES];

/** Une relance due aujourd'hui ou dépassée. */
export function relanceState(date: string | null | undefined): 'aucune' | 'a_venir' | 'aujourdhui' | 'en_retard' {
  if (!date) return 'aucune';
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due.getTime() < today.getTime()) return 'en_retard';
  if (due.getTime() === today.getTime()) return 'aujourdhui';
  return 'a_venir';
}

/** Numéro au format international, prêt pour un lien wa.me. */
export function whatsappLink(telephone: string | null | undefined): string | null {
  if (!telephone) return null;
  const digits = telephone.replace(/[^0-9]/g, '');
  if (digits.length < 8) return null;
  // Un numéro saisi sans indicatif est supposé sénégalais (+221).
  const international = digits.length <= 9 ? '221' + digits : digits;
  return 'https://wa.me/' + international;
}

export function telLink(telephone: string | null | undefined): string | null {
  if (!telephone) return null;
  const cleaned = telephone.replace(/[^0-9+]/g, '');
  return cleaned ? 'tel:' + cleaned : null;
}
