import type { LotPublic } from '../api/programmes';
import { formatMoney } from './format';

/** Fourchette de prix d'un programme : « 12 000 000 FCFA » ou « de 12 000 000 à 18 000 000 FCFA ». */
export function fourchettePrix(min: number | null, max: number | null): string {
  if (min === null) return 'Prix sur demande';
  if (max === null || max === min) return formatMoney(min);
  return `de ${formatMoney(min).replace(' FCFA', '')} à ${formatMoney(max)}`;
}

/** Conditions d'un lot en une ligne : « 6 mois de moratoire · acompte 2 000 000 FCFA ». */
export function conditionsDuLot(lot: LotPublic): string {
  const morceaux: string[] = [];
  if (lot.modalitePaiement) morceaux.push(lot.modalitePaiement);
  if (lot.dureeMoratoireMois) morceaux.push(`${lot.dureeMoratoireMois} mois de moratoire`);
  if (lot.acompteMontant) morceaux.push(`acompte ${formatMoney(lot.acompteMontant)}`);
  return morceaux.join(' · ');
}
