import type { StatusChoice, StatusTone } from '../../shared/dialogs/status-choice-dialog';
import type { VenteReservation } from '../../core/models/vente.model';

export interface StatusMeaning {
  tone: StatusTone;
  label: string;
  help: string;
}

/** Statuts d'un dossier de vente (référentiel « ventes.statuts »). */
export const DOSSIER_STATUS: Record<string, StatusMeaning> = {
  en_cours: { tone: 'info', label: 'En cours', help: 'Dossier ouvert : le terrain intéresse le client, rien n’est encore engagé.' },
  pre_reserve: { tone: 'warning', label: 'Pré-réservé', help: 'Intention ferme, acompte pas encore versé : le terrain reste visible sur le site.' },
  reserve: { tone: 'warning', label: 'Réservé', help: 'Acompte versé : le terrain est bloqué pour ce client et retiré du site.' },
  paiement_partiel: { tone: 'primary', label: 'Paiement partiel', help: 'Une partie du prix est encaissée ; le solde reste dû.' },
  solde: { tone: 'success', label: 'Soldé', help: 'Prix intégralement payé : la vente est conclue.' },
  annule: { tone: 'danger', label: 'Annulé', help: 'Le dossier est abandonné ; le terrain redevient disponible.' },
};

export const PAYMENT_STATUS: Record<string, StatusMeaning> = {
  en_attente: { tone: 'warning', label: 'À valider', help: 'Enregistré par un commercial, en attente de contrôle (comptabilité / direction).' },
  valide: { tone: 'success', label: 'Validé', help: 'Contrôlé : compte dans le montant payé.' },
  refuse: { tone: 'danger', label: 'Refusé', help: 'Paiement non retenu.' },
};

export const PAYMENT_MODES: Record<string, string> = {
  especes: 'Espèces',
  virement: 'Virement',
  en_ligne: 'Paiement en ligne',
  cheque: 'Chèque',
  mobile_money: 'Mobile money',
  acompte: 'Acompte de réservation',
};

export const RESERVATION_STATUS: Record<string, StatusMeaning> = {
  active: { tone: 'warning', label: 'Active', help: 'Le terrain est bloqué jusqu’à la date d’expiration.' },
  confirmee: { tone: 'success', label: 'Confirmée', help: 'Réservation confirmée par un paiement.' },
  expiree: { tone: 'neutral', label: 'Expirée', help: 'Délai dépassé sans suite : le terrain est libéré.' },
  annulee: { tone: 'danger', label: 'Annulée', help: 'Réservation annulée.' },
};

export const COMMISSION_STATUS: Record<string, StatusMeaning> = {
  estimee: { tone: 'info', label: 'Estimée', help: 'Calculée selon la règle ; à valider par un responsable.' },
  validee: { tone: 'warning', label: 'Validée', help: 'Montant confirmé ; à payer une fois le dossier soldé.' },
  payee: { tone: 'success', label: 'Payée', help: 'Versée au commercial.' },
};

export const ECHEANCE_STATUS: Record<string, StatusMeaning> = {
  en_attente: { tone: 'warning', label: 'À venir', help: 'Échéance non encore réglée.' },
  planifiee: { tone: 'neutral', label: 'Planifiée', help: 'Prochaine échéance.' },
  payee: { tone: 'success', label: 'Payée', help: 'Réglée.' },
  en_retard: { tone: 'danger', label: 'En retard', help: 'Date dépassée sans paiement.' },
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

export function modeLabel(mode: string | null | undefined): string {
  return (mode && PAYMENT_MODES[mode]) || mode || '—';
}

export function clientName(prospect: { nom: string; prenom: string | null }): string {
  return [prospect.prenom, prospect.nom].filter(Boolean).join(' ');
}

/** Réservation qui bloque encore le terrain, s'il y en a une. */
export function activeReservation(dossier: { reservations: VenteReservation[] }): VenteReservation | null {
  const now = Date.now();
  return dossier.reservations.find((reservation) => ['active', 'confirmee'].includes(reservation.statut) && new Date(reservation.dateExpiration).getTime() > now) ?? null;
}

/** Jours avant expiration d'une réservation (négatif si dépassée). */
export function joursAvantExpiration(reservation: VenteReservation): number {
  return Math.ceil((new Date(reservation.dateExpiration).getTime() - Date.now()) / 86_400_000);
}

/** Part du prix déjà encaissée (0–100), null sans prix. */
export function progression(dossier: { prixVente: number | string | null; montantPaye: number | null }): number | null {
  const prix = Number(dossier.prixVente ?? 0);
  if (!prix) return null;
  return Math.min(100, Math.round((Number(dossier.montantPaye ?? 0) / prix) * 100));
}
