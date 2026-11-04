/**
 * Calculs du pilotage d'un programme : à partir des dossiers de vente de ses
 * lots, ce que chaque client doit, a payé et doit encore ; ce que le programme
 * a encaissé et ce qui est en retard. Fonctions pures, sans accès à la base.
 */

import {
  margeReconnue,
  nombre as nombreFinance,
} from '../finances/finances.calculs';
import {
  commissionReconnue,
  situationProprietaire,
} from '../finances/tresorerie.calculs';
import { estConfie } from './programmes-compta';

type Montant = number | string | { toString(): string } | null | undefined;

const num = (valeur: Montant): number => Number(valeur ?? 0);

const JOUR = 24 * 60 * 60 * 1000;

export type DossierPilotage = {
  id: string;
  referenceInterne: string | null;
  statut: string;
  prixVente: Montant;
  prospect: {
    id: string;
    nom: string;
    prenom: string | null;
    telephone: string | null;
  };
  terrain: {
    id: string;
    referenceInterne: string;
    nom: string;
    numeroLot: string | null;
    /** Ce que la comptabilité exige du bien : sa commission (confié) ou sa marge (en propre). */
    proprietaireId?: string | null;
    produitDirect?: boolean;
    commission?: Montant;
    marge?: Montant;
  } | null;
  reversements?: Array<{ montant: Montant; statut: string }>;
  commercialResponsable: { firstName: string; lastName: string } | null;
  paiements: Array<{
    id: string;
    montant: Montant;
    datePaiement: Date;
    mode: string;
    statut: string;
    reference: string | null;
  }>;
  echeances: Array<{
    numero: number;
    dateEcheance: Date;
    montantPrevu: Montant;
    montantPaye: Montant;
    statut: string;
  }>;
};

export type LigneClient = {
  dossierId: string;
  reference: string | null;
  statut: string;
  client: { id: string; nom: string; telephone: string | null };
  lot: { id: string; numero: string; nom: string } | null;
  commercial: string | null;
  prixVente: number | null;
  montantPaye: number;
  aValider: number;
  soldeRestant: number | null;
  tauxPaye: number | null;
  prochaineEcheance: { date: Date; montant: number } | null;
  retard: { montant: number; jours: number; nombre: number } | null;
};

export type LigneVersement = {
  id: string;
  dossierId: string;
  dossierReference: string | null;
  client: string;
  lot: string | null;
  montant: number;
  datePaiement: Date;
  mode: string;
  statut: string;
  reference: string | null;
};

export type LigneEcheance = {
  dossierId: string;
  dossierReference: string | null;
  client: string;
  lot: string | null;
  numero: number;
  dateEcheance: Date;
  reste: number;
  joursRetard: number;
};

export type FinancesProgramme = {
  dossiers: number;
  dossiersSoldes: number;
  totalAttendu: number;
  encaisse: number;
  aValider: number;
  resteAEncaisser: number;
  enRetard: number;
  echeancesEnRetard: number;
};

const nomClient = (p: { nom: string; prenom: string | null }): string =>
  [p.prenom, p.nom].filter(Boolean).join(' ');

const libelleLot = (t: DossierPilotage['terrain']): string | null =>
  t ? t.numeroLot || t.referenceInterne : null;

/** Début de la journée : une échéance du jour n'est pas encore en retard. */
export function debutDeJournee(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Un dossier annulé ne compte ni dans l'attendu ni dans l'encaissé. */
export const estAnnule = (dossier: Pick<DossierPilotage, 'statut'>): boolean =>
  dossier.statut === 'annule';

function echeancesDues(dossier: DossierPilotage, aujourdhui: Date) {
  const debut = debutDeJournee(aujourdhui).getTime();
  return dossier.echeances
    .map((e) => ({
      numero: e.numero,
      dateEcheance: e.dateEcheance,
      reste: Math.max(0, num(e.montantPrevu) - num(e.montantPaye)),
      payee: e.statut === 'payee',
    }))
    .filter((e) => !e.payee && e.reste > 0)
    .map((e) => ({
      ...e,
      joursRetard: Math.max(
        0,
        Math.floor((debut - e.dateEcheance.getTime()) / JOUR),
      ),
      enRetard: e.dateEcheance.getTime() < debut,
    }));
}

export function ligneClient(
  dossier: DossierPilotage,
  aujourdhui: Date,
): LigneClient {
  const prixVente = dossier.prixVente === null ? null : num(dossier.prixVente);
  const montantPaye = dossier.paiements
    .filter((p) => p.statut === 'valide')
    .reduce((somme, p) => somme + num(p.montant), 0);
  const aValider = dossier.paiements
    .filter((p) => p.statut === 'en_attente')
    .reduce((somme, p) => somme + num(p.montant), 0);
  const dues = echeancesDues(dossier, aujourdhui);
  const enRetard = dues.filter((e) => e.enRetard);
  const prochaine = dues.find((e) => !e.enRetard);
  return {
    dossierId: dossier.id,
    reference: dossier.referenceInterne,
    statut: dossier.statut,
    client: {
      id: dossier.prospect.id,
      nom: nomClient(dossier.prospect),
      telephone: dossier.prospect.telephone,
    },
    lot: dossier.terrain
      ? {
          id: dossier.terrain.id,
          numero: libelleLot(dossier.terrain) ?? '',
          nom: dossier.terrain.nom,
        }
      : null,
    commercial: dossier.commercialResponsable
      ? `${dossier.commercialResponsable.firstName} ${dossier.commercialResponsable.lastName}`
      : null,
    prixVente,
    montantPaye,
    aValider,
    soldeRestant:
      prixVente === null ? null : Math.max(0, prixVente - montantPaye),
    tauxPaye:
      prixVente && prixVente > 0
        ? Math.min(100, Math.round((montantPaye / prixVente) * 100))
        : null,
    prochaineEcheance: prochaine
      ? { date: prochaine.dateEcheance, montant: prochaine.reste }
      : null,
    retard: enRetard.length
      ? {
          montant: enRetard.reduce((somme, e) => somme + e.reste, 0),
          jours: Math.max(...enRetard.map((e) => e.joursRetard)),
          nombre: enRetard.length,
        }
      : null,
  };
}

export function lignesVersements(
  dossiers: DossierPilotage[],
): LigneVersement[] {
  return dossiers
    .flatMap((dossier) =>
      dossier.paiements.map((p) => ({
        id: p.id,
        dossierId: dossier.id,
        dossierReference: dossier.referenceInterne,
        client: nomClient(dossier.prospect),
        lot: libelleLot(dossier.terrain),
        montant: num(p.montant),
        datePaiement: p.datePaiement,
        mode: p.mode,
        statut: p.statut,
        reference: p.reference,
      })),
    )
    .sort((a, b) => b.datePaiement.getTime() - a.datePaiement.getTime());
}

/** Échéances impayées des dossiers vivants, les plus en retard d'abord. */
export function lignesEcheances(
  dossiers: DossierPilotage[],
  aujourdhui: Date,
): LigneEcheance[] {
  return dossiers
    .filter((d) => !estAnnule(d))
    .flatMap((dossier) =>
      echeancesDues(dossier, aujourdhui).map((e) => ({
        dossierId: dossier.id,
        dossierReference: dossier.referenceInterne,
        client: nomClient(dossier.prospect),
        lot: libelleLot(dossier.terrain),
        numero: e.numero,
        dateEcheance: e.dateEcheance,
        reste: e.reste,
        joursRetard: e.joursRetard,
      })),
    )
    .sort((a, b) => a.dateEcheance.getTime() - b.dateEcheance.getTime());
}

export function financesProgramme(
  dossiers: DossierPilotage[],
  aujourdhui: Date,
): FinancesProgramme {
  const vivants = dossiers.filter((d) => !estAnnule(d));
  const lignes = vivants.map((d) => ligneClient(d, aujourdhui));
  const totalAttendu = lignes.reduce((s, l) => s + (l.prixVente ?? 0), 0);
  const encaisse = lignes.reduce((s, l) => s + l.montantPaye, 0);
  return {
    dossiers: vivants.length,
    dossiersSoldes: vivants.filter((d) => d.statut === 'solde').length,
    totalAttendu,
    encaisse,
    aValider: lignes.reduce((s, l) => s + l.aValider, 0),
    resteAEncaisser: lignes.reduce((s, l) => s + (l.soldeRestant ?? 0), 0),
    enRetard: lignes.reduce((s, l) => s + (l.retard?.montant ?? 0), 0),
    echeancesEnRetard: lignes.reduce((s, l) => s + (l.retard?.nombre ?? 0), 0),
  };
}

export type ComptaProgramme = {
  /** Tout ce qui est rentré sur les lots du programme (paiements validés) : ce que montre le journal. */
  encaisseJournal: number;
  /** Dont l'argent de dossiers annulés : il est rentré, mais il est à rembourser. */
  encaisseSurAnnules: number;
  /**
   * Revenu de MTM déjà acquis, calculé comme le journal : sur tous les paiements validés, commission ou
   * marge au prorata. Le journal ne le retire pas quand un client se désiste : la sortie vient ensuite
   * du remboursement.
   */
  revenuAcquis: number;
  /** Dont le revenu acquis sur des dossiers annulés. */
  revenuSurAnnules: number;
  /** Part de l'encaissé qui revient aux propriétaires (biens confiés). */
  partProprietaires: number;
  reverse: number;
  enCoursReversement: number;
  /** Ce que MTM devra encore reverser aux propriétaires sur la vente entière. */
  resteAReverser: number;
  /** Dossiers dont le bien n'a ni commission ni marge : leur revenu compte pour zéro dans les comptes. */
  dossiersSansBase: number;
};

/**
 * La vue comptable du programme, avec les mêmes formules que le journal et la situation des
 * propriétaires : c'est ce qui permet de recouper les trois chiffres.
 */
export function comptaProgramme(dossiers: DossierPilotage[]): ComptaProgramme {
  const compta: ComptaProgramme = {
    encaisseJournal: 0,
    encaisseSurAnnules: 0,
    revenuAcquis: 0,
    revenuSurAnnules: 0,
    partProprietaires: 0,
    reverse: 0,
    enCoursReversement: 0,
    resteAReverser: 0,
    dossiersSansBase: 0,
  };
  for (const dossier of dossiers) {
    const terrain = dossier.terrain;
    const prix = nombreFinance(dossier.prixVente);
    const valides = dossier.paiements.filter((p) => p.statut === 'valide');
    const encaisse = valides.reduce((t, p) => t + nombreFinance(p.montant), 0);
    compta.encaisseJournal += encaisse;
    // Même règle que le journal : un bien confié rapporte sa commission, sinon sa marge.
    const confie =
      Boolean(terrain) &&
      estConfie({
        proprietaireId: terrain?.proprietaireId ?? null,
        produitDirect: terrain?.produitDirect ?? false,
      }) &&
      terrain?.commission !== null &&
      terrain?.commission !== undefined;
    const marge =
      terrain?.marge === null || terrain?.marge === undefined
        ? null
        : nombreFinance(terrain.marge);
    const annule = estAnnule(dossier);
    if (!confie && marge === null && !annule) compta.dossiersSansBase += 1;
    let revenu = 0;
    for (const p of valides) {
      const montant = nombreFinance(p.montant);
      revenu += confie
        ? commissionReconnue(nombreFinance(terrain?.commission), montant, prix)
        : margeReconnue(marge, montant, prix);
    }
    compta.revenuAcquis += revenu;
    if (annule) {
      compta.encaisseSurAnnules += encaisse;
      compta.revenuSurAnnules += revenu;
      continue;
    }
    if (confie) {
      compta.partProprietaires += encaisse - revenu;
      const reverse = (dossier.reversements ?? [])
        .filter((r) => r.statut === 'paye')
        .reduce((t, r) => t + nombreFinance(r.montant), 0);
      const enCours = (dossier.reversements ?? [])
        .filter((r) => r.statut === 'en_attente' || r.statut === 'autorise')
        .reduce((t, r) => t + nombreFinance(r.montant), 0);
      compta.reverse += reverse;
      compta.enCoursReversement += enCours;
      compta.resteAReverser += situationProprietaire({
        prixVente: prix,
        commission: nombreFinance(terrain?.commission),
        encaisse,
        reverse,
        enCours,
        mode: 'au_fur_et_a_mesure',
      }).soldeRestant;
    }
  }
  const arrondi = (n: number) => Math.round(n * 100) / 100;
  for (const cle of Object.keys(compta) as Array<keyof ComptaProgramme>) {
    compta[cle] = arrondi(compta[cle]);
  }
  return compta;
}
