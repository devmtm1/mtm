/**
 * Règles du cahier des charges du DG, sans accès à la base : seuils de
 * validation, rattachement d'un mouvement à un compte, soldes, dû aux
 * propriétaires, remboursement d'un désistement, marge d'un chantier.
 */
import { type LigneJournal, arrondir, nombre } from './finances.calculs';

// ---------------------------------------------------------------------------
// Seuils de validation des dépenses
// ---------------------------------------------------------------------------

export interface Seuils {
  /** Jusqu'à ce montant : la comptable paie seule, justificatif obligatoire. */
  palier1: number;
  /** Jusqu'à ce montant : autorisation préalable de la Direction générale. */
  palier2: number;
  /** Jusqu'à ce montant : autorisation expresse, justificatifs renforcés. Au-delà : contrôle renforcé. */
  palier3: number;
}

export const SEUILS_DEFAUT: Seuils = {
  palier1: 50_000,
  palier2: 200_000,
  palier3: 500_000,
};

/** Lit les seuils réglés ; une valeur incohérente retombe sur les seuils validés par la Direction. */
export function lireSeuils(valeur: unknown): Seuils {
  const brut = (valeur ?? {}) as Partial<Record<keyof Seuils, unknown>>;
  const seuils: Seuils = {
    palier1: nombre(brut.palier1),
    palier2: nombre(brut.palier2),
    palier3: nombre(brut.palier3),
  };
  const coherents =
    seuils.palier1 > 0 &&
    seuils.palier2 > seuils.palier1 &&
    seuils.palier3 > seuils.palier2;
  return coherents ? seuils : { ...SEUILS_DEFAUT };
}

export type NiveauValidation = 0 | 1 | 2 | 3;

/**
 * 0 : la comptable seule ; 1 : autorisation préalable de la Direction ;
 * 2 : autorisation expresse et justificatifs renforcés ; 3 : contrôle renforcé.
 */
export function niveauValidation(
  montant: number,
  seuils: Seuils = SEUILS_DEFAUT,
): NiveauValidation {
  if (montant <= seuils.palier1) return 0;
  if (montant <= seuils.palier2) return 1;
  if (montant <= seuils.palier3) return 2;
  return 3;
}

export const LIBELLES_NIVEAU: Record<NiveauValidation, string> = {
  0: 'Comptable (justificatif obligatoire)',
  1: 'Autorisation préalable de la Direction',
  2: 'Autorisation expresse et justificatifs renforcés',
  3: 'Autorisation expresse et contrôle renforcé',
};

/**
 * Délégations : une personne sans le droit « autoriser » peut autoriser jusqu'à
 * un plafond que la Direction lui a donné. Clé : identifiant de l'utilisateur.
 */
export function plafondDelegation(
  delegations: unknown,
  userId: string,
): number {
  if (!delegations || typeof delegations !== 'object') return 0;
  return nombre((delegations as Record<string, unknown>)[userId]);
}

export function peutAutoriser(
  permissions: string[],
  delegations: unknown,
  userId: string,
  montant: number,
): boolean {
  if (permissions.includes('finances:autoriser')) return true;
  return plafondDelegation(delegations, userId) >= montant && montant > 0;
}

// ---------------------------------------------------------------------------
// Numéro d'opération
// ---------------------------------------------------------------------------

export function numeroOperation(
  prefixe: string,
  date: Date,
  sequence: number,
): string {
  return `${prefixe}-${date.getUTCFullYear()}-${String(sequence).padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Comptes de trésorerie
// ---------------------------------------------------------------------------

export const TYPES_COMPTE = [
  'caisse',
  'banque',
  'wave',
  'orange_money',
  'autre',
] as const;
export type TypeCompte = (typeof TYPES_COMPTE)[number];

export const LIBELLES_TYPE_COMPTE: Record<TypeCompte, string> = {
  caisse: 'Caisse',
  banque: 'Banque',
  wave: 'Wave',
  orange_money: 'Orange Money',
  autre: 'Autre',
};

/** « Orange Money », « orange-money » et « ORANGE_MONEY » désignent le même mode. */
export function normaliserMode(mode: string | null | undefined): string {
  return (mode ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

export interface CompteLeger {
  id: string;
  modes: string[];
  actif?: boolean;
}

/** Compte qui sert un mode de paiement : le premier compte actif qui le déclare. */
export function compteDuMode(
  mode: string | null | undefined,
  comptes: CompteLeger[],
): string | null {
  const cherche = normaliserMode(mode);
  if (!cherche) return null;
  const trouve = comptes.find(
    (compte) =>
      compte.actif !== false &&
      compte.modes.some((m) => normaliserMode(m) === cherche),
  );
  return trouve?.id ?? null;
}

export interface MouvementFondsLeger {
  compteSourceId: string | null;
  compteDestinationId: string | null;
  montant: number;
  date: Date;
}

export interface FluxCompte {
  entrees: number;
  sorties: number;
}

/**
 * Mouvements d'un compte sur [du, au[ : les lignes du journal rattachées au
 * compte (par compte imposé ou par mode de paiement) et les mouvements de
 * fonds confirmés qui y entrent ou en sortent. Les lignes sans compte
 * reconnu sont comptées à part, pour que rien ne disparaisse en silence.
 */
export function fluxParCompte(
  lignes: LigneJournal[],
  mouvements: MouvementFondsLeger[],
  comptes: CompteLeger[],
  du: Date,
  au: Date,
): { parCompte: Map<string, FluxCompte>; sansCompte: FluxCompte } {
  const parCompte = new Map<string, FluxCompte>(
    comptes.map((c) => [c.id, { entrees: 0, sorties: 0 }]),
  );
  const sansCompte: FluxCompte = { entrees: 0, sorties: 0 };
  const dans = (date: Date) => date >= du && date < au;

  for (const ligne of lignes) {
    if (!dans(ligne.date)) continue;
    const id = ligne.compteId ?? compteDuMode(ligne.mode, comptes);
    const cible = (id && parCompte.get(id)) || sansCompte;
    if (ligne.sens === 'entree') cible.entrees += ligne.montant;
    else cible.sorties += ligne.montant;
  }
  for (const mouvement of mouvements) {
    if (!dans(mouvement.date)) continue;
    const source = mouvement.compteSourceId
      ? parCompte.get(mouvement.compteSourceId)
      : undefined;
    const destination = mouvement.compteDestinationId
      ? parCompte.get(mouvement.compteDestinationId)
      : undefined;
    if (source) source.sorties += mouvement.montant;
    if (destination) destination.entrees += mouvement.montant;
  }
  return { parCompte, sansCompte };
}

/** Solde théorique : ce qu'il devrait y avoir dans le compte. */
export function soldeTheorique(soldeInitial: number, flux: FluxCompte): number {
  return soldeInitial + flux.entrees - flux.sorties;
}

/** Écart de caisse : positif si l'on a compté plus que prévu, négatif s'il manque de l'argent. */
export function ecartCaisse(montantCompte: number, theorique: number): number {
  return arrondir(montantCompte - theorique);
}

/** Jour (UTC, minuit) d'un instant. */
export function jourUtc(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function jourSuivant(date: Date): Date {
  return new Date(jourUtc(date).getTime() + 24 * 3600 * 1000);
}

// ---------------------------------------------------------------------------
// Terrains confiés : commission de MTM, dû au propriétaire
// ---------------------------------------------------------------------------

export const MODES_REVERSEMENT = [
  'au_fur_et_a_mesure',
  'fin_paiement',
  'echeancier',
] as const;
export type ModeReversement = (typeof MODES_REVERSEMENT)[number];

export const LIBELLES_MODE_REVERSEMENT: Record<ModeReversement, string> = {
  au_fur_et_a_mesure: 'Au fur et à mesure des paiements du client',
  fin_paiement: 'À la fin du paiement du client',
  echeancier: 'Selon l’échéancier du contrat',
};

export interface SituationProprietaire {
  prixVente: number;
  /** Commission de MTM fixée au contrat, pour la vente entière. */
  commission: number;
  /** Montant dû au propriétaire pour la vente entière. */
  du: number;
  encaisse: number;
  /** Part de la commission déjà acquise par MTM (au prorata de l'encaissé). */
  commissionAcquise: number;
  /** Part de l'argent encaissé qui revient au propriétaire. */
  partProprietaire: number;
  /** Ce que MTM peut reverser maintenant, sans avance. */
  exigible: number;
  reverse: number;
  /** Reversements demandés ou autorisés, pas encore payés. */
  enCours: number;
  /** Reste à reverser sur la vente entière : du − reversé. */
  soldeRestant: number;
  /** Plafond d'un reversement normal. */
  disponibleSansAvance: number;
  /** Plafond d'un reversement exceptionnel (avance) : tout le dû restant. */
  disponibleAvecAvance: number;
  solde: boolean;
}

/**
 * MTM encaisse d'abord, déduit sa commission contractuelle, puis reverse. Le
 * montant exigible dépend du mode du contrat : au fur et à mesure, il suit
 * l'encaissé ; à la fin du paiement, il n'existe qu'une fois la vente soldée.
 */
export function situationProprietaire(entree: {
  prixVente: number;
  commission: number;
  encaisse: number;
  reverse: number;
  enCours: number;
  mode: string;
}): SituationProprietaire {
  const prixVente = Math.max(0, entree.prixVente);
  const commission = Math.min(Math.max(0, entree.commission), prixVente);
  const du = prixVente - commission;
  const encaisse = Math.max(0, entree.encaisse);
  const ratio = prixVente > 0 ? Math.min(1, encaisse / prixVente) : 0;
  const solde = prixVente > 0 && encaisse >= prixVente;
  const commissionAcquise = arrondir(commission * ratio);
  const partProprietaire = arrondir(du * ratio);
  const exigible =
    entree.mode === 'fin_paiement' ? (solde ? du : 0) : partProprietaire;
  const soldeRestant = Math.max(0, du - entree.reverse);
  const disponibleSansAvance = Math.max(
    0,
    Math.min(exigible, du) - entree.reverse - entree.enCours,
  );
  const disponibleAvecAvance = Math.max(
    0,
    du - entree.reverse - entree.enCours,
  );
  return {
    prixVente,
    commission,
    du,
    encaisse,
    commissionAcquise,
    partProprietaire,
    exigible,
    reverse: entree.reverse,
    enCours: entree.enCours,
    soldeRestant,
    disponibleSansAvance,
    disponibleAvecAvance,
    solde,
  };
}

/**
 * Part de la commission contractuelle reconnue comme revenu de MTM par un
 * paiement : même logique que la marge d'un terrain en propre.
 */
export function commissionReconnue(
  commission: number,
  paiement: number,
  prixVente: number,
): number {
  if (!(prixVente > 0) || !(paiement > 0) || !(commission > 0)) return 0;
  return arrondir((Math.min(commission, prixVente) * paiement) / prixVente);
}

// ---------------------------------------------------------------------------
// Désistement et remboursement
// ---------------------------------------------------------------------------

export interface ReglesDesistement {
  /** Part de l'avance retenue, en %. */
  retenuePct: number;
  /** Délai de remboursement, en mois. */
  delaiMois: number;
  /** La clause a-t-elle été validée juridiquement ? */
  validee: boolean;
  version: string | null;
}

export const REGLES_DESISTEMENT_DEFAUT: ReglesDesistement = {
  retenuePct: 50,
  delaiMois: 6,
  validee: false,
  version: null,
};

export function lireReglesDesistement(valeur: unknown): ReglesDesistement {
  const brut = (valeur ?? {}) as Record<string, unknown>;
  const retenue = brut.retenuePct;
  const delai = brut.delaiMois;
  return {
    retenuePct:
      typeof retenue === 'number' && retenue >= 0 && retenue <= 100
        ? retenue
        : REGLES_DESISTEMENT_DEFAUT.retenuePct,
    delaiMois:
      typeof delai === 'number' && Number.isInteger(delai) && delai > 0
        ? delai
        : REGLES_DESISTEMENT_DEFAUT.delaiMois,
    validee: brut.validee === true,
    version:
      typeof brut.version === 'string' && brut.version.trim()
        ? brut.version.trim()
        : null,
  };
}

/**
 * La retenue porte sur l'avance versée ; tout ce qui a été payé au-delà de
 * l'avance est remboursable en entier.
 */
export function calculRemboursement(
  montantVerse: number,
  avance: number,
  retenuePct: number,
): { retenu: number; rembourse: number } {
  const base = Math.min(Math.max(0, avance), Math.max(0, montantVerse));
  const retenu = arrondir((base * retenuePct) / 100);
  return { retenu, rembourse: Math.max(0, montantVerse - retenu) };
}

/** Ajoute des mois à une date (UTC) sans déborder sur le mois suivant : le 31 août + 6 mois = le 28 février. */
export function ajouterMois(date: Date, mois: number): Date {
  const annee = date.getUTCFullYear();
  const cible = date.getUTCMonth() + mois;
  const dernierJour = new Date(Date.UTC(annee, cible + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(annee, cible, Math.min(date.getUTCDate(), dernierJour)),
  );
}

// ---------------------------------------------------------------------------
// Fiche financière d'un chantier
// ---------------------------------------------------------------------------

export interface FicheChantierEntree {
  prixTotal: number;
  budgetPrevu: number;
  avancement: number;
  recettesConfirmees: number;
  recettesEnAttente: number;
  coutReel: number;
  achatsClient: number;
}

export interface FicheChantierCalculee {
  margePrevisionnelle: number;
  margeReelle: number;
  resteAEngager: number;
  coutFinalEstime: number;
  resultatEstime: number;
  resteACollecter: number;
  depassementBudget: boolean;
}

/**
 * Le coût final estimé est le plus élevé du budget prévu et de ce que le
 * rythme actuel annonce (coût réel ramené à l'avancement), tant que le
 * chantier a assez avancé (10 %) pour que la projection ait un sens.
 */
export function ficheChantier(e: FicheChantierEntree): FicheChantierCalculee {
  const projection =
    e.avancement >= 10 && e.avancement < 100
      ? arrondir((e.coutReel * 100) / e.avancement)
      : e.coutReel;
  const coutFinalEstime = Math.max(e.budgetPrevu, projection, e.coutReel);
  return {
    margePrevisionnelle: e.prixTotal - e.budgetPrevu,
    margeReelle: e.recettesConfirmees - e.coutReel,
    resteAEngager: Math.max(0, coutFinalEstime - e.coutReel),
    coutFinalEstime,
    resultatEstime: e.prixTotal - coutFinalEstime,
    resteACollecter: Math.max(0, e.prixTotal - e.recettesConfirmees),
    depassementBudget: e.budgetPrevu > 0 && e.coutReel > e.budgetPrevu,
  };
}
