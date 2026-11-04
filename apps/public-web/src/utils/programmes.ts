import type { ConditionsPubliques, LotPublic, ProgrammePublic, StatutLotPublic } from '../api/programmes';
import { formatMoney, groupDigits } from './format';

/** Fourchette de prix d'un programme : « 12 000 000 FCFA » ou « de 12 000 000 à 18 000 000 FCFA ». */
export function fourchettePrix(min: number | null, max: number | null): string {
  if (min === null) return 'Prix sur demande';
  if (max === null || max === min) return formatMoney(min);
  return `de ${formatMoney(min).replace(' FCFA', '')} à ${formatMoney(max)}`;
}

/** Fourchette de superficie : « 250 m² » ou « de 250 à 400 m² ». Vide quand elle n'est pas renseignée. */
export function fourchetteSuperficie(min: number | null, max: number | null, unite: string | null): string {
  if (min === null) return '';
  const u = unite ?? 'm²';
  if (max === null || max === min) return `${groupDigits(min)} ${u}`;
  return `de ${groupDigits(min)} à ${groupDigits(max)} ${u}`;
}

/** « 1 lot », « 4 lots ». */
export function nombreDeLots(n: number): string {
  return `${n} lot${n > 1 ? 's' : ''}`;
}

/** Part des lots déjà réservés ou vendus, en pourcentage entier : 0 sans lot. */
export function tauxEngage(p: Pick<ProgrammePublic, 'lotsTotal' | 'lotsReserves' | 'lotsVendus'>): number {
  return p.lotsTotal > 0 ? Math.round(((p.lotsReserves + p.lotsVendus) / p.lotsTotal) * 100) : 0;
}

/** Ce que dit la carte d'un programme de ses disponibilités : « 4 lots disponibles sur 6 », « Dernier lot ». */
export function disponibilites(p: Pick<ProgrammePublic, 'lotsTotal' | 'lotsDisponibles'>): string {
  if (p.lotsDisponibles === 1) return 'Dernier lot disponible';
  if (p.lotsTotal > p.lotsDisponibles) return `${p.lotsDisponibles} lots disponibles sur ${p.lotsTotal}`;
  return `${nombreDeLots(p.lotsDisponibles)} disponible${p.lotsDisponibles > 1 ? 's' : ''}`;
}

/** Conditions d'un lot en une ligne : « 6 mois de moratoire · acompte 2 000 000 FCFA ». */
export function conditionsDuLot(
  lot: Pick<LotPublic, 'modalitePaiement' | 'dureeMoratoireMois' | 'acompteMontant'>,
): string {
  const morceaux: string[] = [];
  if (lot.modalitePaiement) morceaux.push(lot.modalitePaiement);
  if (lot.dureeMoratoireMois) morceaux.push(`${lot.dureeMoratoireMois} mois de moratoire`);
  if (lot.acompteMontant) morceaux.push(`acompte ${formatMoney(lot.acompteMontant)}`);
  return morceaux.join(' · ');
}

/** Les conditions de paiement du programme, une phrase par point : ce que le visiteur retient avant de contacter. */
export function pointsDeConditions(c: ConditionsPubliques): string[] {
  const points: string[] = [];
  if (c.modalites.length > 0) points.push(`Paiement : ${c.modalites.join(', ')}`);
  if (c.acompteMin) points.push(`Acompte à partir de ${formatMoney(c.acompteMin)}`);
  if (c.moratoireMax) points.push(`Moratoire jusqu'à ${c.moratoireMax} mois`);
  return points;
}

export interface LotStatutStyle {
  libelle: string;
  /** Pastille du statut, lisible sur fond clair. */
  pastille: string;
}

export const STATUT_LOT: Record<StatutLotPublic, LotStatutStyle> = {
  Disponible: { libelle: 'Disponible', pastille: 'bg-mtm-success/10 text-mtm-success ring-1 ring-mtm-success/30' },
  Réservé: { libelle: 'Réservé', pastille: 'bg-mtm-warning/10 text-mtm-warning ring-1 ring-mtm-warning/30' },
  Vendu: { libelle: 'Vendu', pastille: 'bg-mtm-border text-mtm-muted ring-1 ring-mtm-border' },
};

export type TriLots = 'numero' | 'prix_asc' | 'prix_desc' | 'superficie_desc';

export const TRIS_LOTS: { cle: TriLots; libelle: string }[] = [
  { cle: 'numero', libelle: 'Numéro du lot' },
  { cle: 'prix_asc', libelle: 'Prix croissant' },
  { cle: 'prix_desc', libelle: 'Prix décroissant' },
  { cle: 'superficie_desc', libelle: 'Plus grande superficie' },
];

export interface CritereLots {
  /** Nom de la catégorie, ou vide pour toutes. */
  categorie: string;
  /** Seulement les lots à vendre, ou tous (les réservés et vendus apparaissent grisés, à la fin). */
  seulementDisponibles: boolean;
  tri: TriLots;
}

/**
 * Les lots à montrer selon les choix du visiteur. Les lots disponibles passent toujours avant les autres :
 * un lot réservé ou vendu rassure sur l'avancement, mais il ne doit pas masquer ceux qu'on peut acheter.
 */
export function lotsAffiches(lots: LotPublic[], critere: CritereLots): LotPublic[] {
  const filtres = lots.filter(
    (l) =>
      (!critere.seulementDisponibles || l.statut === 'Disponible') &&
      (!critere.categorie || l.categorieLot?.nom === critere.categorie),
  );
  const valeur = (l: LotPublic): number | null =>
    critere.tri === 'prix_asc' || critere.tri === 'prix_desc'
      ? l.prixPublic
      : critere.tri === 'superficie_desc'
        ? l.superficie
        : null;
  return [...filtres].sort((a, b) => {
    const libreA = a.statut === 'Disponible' ? 0 : 1;
    const libreB = b.statut === 'Disponible' ? 0 : 1;
    if (libreA !== libreB) return libreA - libreB;
    if (critere.tri !== 'numero') {
      const va = valeur(a);
      const vb = valeur(b);
      // Un prix ou une superficie absents passent après les autres, quel que soit le sens.
      if (va === null && vb !== null) return 1;
      if (vb === null && va !== null) return -1;
      if (va !== null && vb !== null && va !== vb) return critere.tri === 'prix_asc' ? va - vb : vb - va;
    }
    return (a.numeroLot ?? '').localeCompare(b.numeroLot ?? '', 'fr', { numeric: true });
  });
}

/**
 * À partir de combien de lotissements publiés l'accueil leur consacre une section à part. En dessous, ils se mêlent aux
 * biens en vedette : une section d'une seule carte laisserait un grand vide à côté d'elle.
 */
export const SEUIL_SECTION_PROGRAMMES = 3;

/** Valeur du filtre « Type de bien » du catalogue qui ne garde que les lotissements. */
export const TYPE_LOTISSEMENT = 'lotissement';
