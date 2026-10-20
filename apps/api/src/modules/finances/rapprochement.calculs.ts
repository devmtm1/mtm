/**
 * Rapprochement bancaire, sans accès à la base : lecture d'un relevé CSV,
 * empreinte d'une ligne (pour ne pas importer deux fois la même), candidats
 * d'une ligne du relevé parmi les mouvements du logiciel, appariement automatique.
 */
import { arrondir } from './finances.calculs';
import { normaliserMode } from './tresorerie.calculs';

const UN_JOUR = 24 * 3600 * 1000;

/** Écart de dates toléré entre le relevé et la saisie : le virement n'arrive pas le jour de l'ordre. */
export const FENETRE_JOURS = 5;
export const LIGNES_MAX = 5000;

export interface LigneReleve {
  date: Date;
  libelle: string;
  reference: string | null;
  /** Positif : entrée ; négatif : sortie. */
  montant: number;
}

export interface LigneReleveLue extends LigneReleve {
  /** Rang de la ligne dans le fichier, pour les messages d'erreur. */
  numero: number;
}

export interface ErreurReleve {
  ligne: number;
  message: string;
}

/** Sépare une ligne CSV en cellules : guillemets doublés et séparateur dans une cellule entre guillemets. */
export function decouperLigneCsv(ligne: string, separateur: string): string[] {
  const cellules: string[] = [];
  let courante = '';
  let entreGuillemets = false;
  for (let i = 0; i < ligne.length; i += 1) {
    const c = ligne[i];
    if (entreGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') {
        courante += '"';
        i += 1;
      } else if (c === '"') {
        entreGuillemets = false;
      } else {
        courante += c;
      }
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === separateur) {
      cellules.push(courante);
      courante = '';
    } else {
      courante += c;
    }
  }
  cellules.push(courante);
  return cellules.map((c) => c.trim());
}

/** « 1 250 000,50 », « 1.250.000 », « -15000 », « (15 000) » : le montant, arrondi au franc ; `null` si illisible. */
export function lireMontant(brut: string | undefined): number | null {
  if (brut === undefined) return null;
  // \s couvre déjà les espaces insécables et fines que les banques mettent dans les milliers.
  let texte = brut.replace(/\s/g, '').replace(/FCFA|XOF|CFA|F$/gi, '');
  if (texte === '') return null;
  let negatif = false;
  if (/^\(.*\)$/.test(texte)) {
    negatif = true;
    texte = texte.slice(1, -1);
  }
  if (texte.startsWith('-')) {
    negatif = !negatif;
    texte = texte.slice(1);
  } else if (texte.startsWith('+')) {
    texte = texte.slice(1);
  }
  if (!/^[\d.,]+$/.test(texte)) return null;
  const virgule = texte.lastIndexOf(',');
  const point = texte.lastIndexOf('.');
  let decimal = -1;
  if (virgule >= 0 && point >= 0) decimal = Math.max(virgule, point);
  else if (virgule >= 0) decimal = virgule;
  else if (point >= 0) {
    // « 1.250 » ou « 1.250.000 » : des milliers ; « 12.5 » : un décimal.
    const apres = texte.length - point - 1;
    const groupes = texte.split('.').length - 1;
    decimal = apres <= 2 && groupes === 1 ? point : -1;
  }
  const entier = decimal >= 0 ? texte.slice(0, decimal) : texte;
  const fraction = decimal >= 0 ? texte.slice(decimal + 1) : '';
  const nombre = Number(`${entier.replace(/[.,]/g, '')}.${fraction || '0'}`);
  if (!Number.isFinite(nombre)) return null;
  return negatif ? -arrondir(nombre) : arrondir(nombre);
}

/** « 2026-10-19 », « 19/10/2026 », « 19-10-26 » : un jour (UTC) ; `null` si illisible. */
export function lireDate(brut: string | undefined): Date | null {
  if (!brut) return null;
  const texte = brut.trim();
  let annee: number;
  let mois: number;
  let jour: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texte);
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})/.exec(texte);
  if (iso) {
    [annee, mois, jour] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (fr) {
    jour = Number(fr[1]);
    mois = Number(fr[2]);
    annee = Number(fr[3]);
    if (annee < 100) annee += 2000;
  } else {
    return null;
  }
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  const valide =
    date.getUTCFullYear() === annee &&
    date.getUTCMonth() === mois - 1 &&
    date.getUTCDate() === jour;
  return valide ? date : null;
}

type Colonne =
  'date' | 'libelle' | 'reference' | 'montant' | 'debit' | 'credit';

const NOMS_COLONNES: Record<Colonne, string[]> = {
  date: [
    'date',
    'datevaleur',
    'dateoperation',
    'dateope',
    'dateddetransaction',
  ],
  libelle: [
    'libelle',
    'description',
    'operation',
    'motif',
    'detail',
    'details',
    'intitule',
  ],
  reference: [
    'reference',
    'ref',
    'transaction',
    'idtransaction',
    'numero',
    'idop',
  ],
  montant: ['montant', 'amount', 'valeur'],
  debit: ['debit', 'sortie', 'sorties', 'retrait', 'retraits', 'paiement'],
  credit: ['credit', 'entree', 'entrees', 'depot', 'depots', 'versement'],
};

function nomColonne(brut: string): Colonne | null {
  const net = brut
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  for (const [colonne, noms] of Object.entries(NOMS_COLONNES)) {
    if (noms.includes(net)) return colonne as Colonne;
  }
  return null;
}

/**
 * Lit un relevé CSV : séparateur « ; », « , » ou tabulation, ligne d'en-tête
 * obligatoire. Colonnes reconnues : date, libellé, référence, et soit un
 * montant signé, soit un débit et un crédit. Une ligne illisible est
 * signalée, jamais ignorée en silence.
 */
export function lireReleveCsv(contenu: string): {
  lignes: LigneReleveLue[];
  erreurs: ErreurReleve[];
} {
  // Excel ajoute une marque d'ordre des octets en tête des CSV en UTF-8.
  const sansBom = contenu.charCodeAt(0) === 0xfeff ? contenu.slice(1) : contenu;
  const lignesBrutes = sansBom
    .split(/\r?\n/)
    .map((l, index) => ({ texte: l, numero: index + 1 }))
    .filter((l) => l.texte.trim() !== '');
  if (lignesBrutes.length === 0) {
    return {
      lignes: [],
      erreurs: [{ ligne: 1, message: 'Le fichier est vide' }],
    };
  }
  const entete = lignesBrutes[0].texte;
  const separateur = [';', '\t', ','].reduce((meilleur, candidat) =>
    entete.split(candidat).length > entete.split(meilleur).length
      ? candidat
      : meilleur,
  );
  const colonnes = decouperLigneCsv(entete, separateur).map(nomColonne);
  const indice = (colonne: Colonne): number => colonnes.indexOf(colonne);
  const iDate = indice('date');
  const iMontant = indice('montant');
  const iDebit = indice('debit');
  const iCredit = indice('credit');
  if (iDate < 0 || (iMontant < 0 && iDebit < 0 && iCredit < 0)) {
    return {
      lignes: [],
      erreurs: [
        {
          ligne: lignesBrutes[0].numero,
          message:
            'En-tête non reconnu : il faut une colonne « date » et soit « montant », soit « débit » et/ou « crédit »',
        },
      ],
    };
  }
  const iLibelle = indice('libelle');
  const iReference = indice('reference');

  const lignes: LigneReleveLue[] = [];
  const erreurs: ErreurReleve[] = [];
  for (const { texte, numero } of lignesBrutes.slice(1)) {
    if (lignes.length >= LIGNES_MAX) {
      erreurs.push({
        ligne: numero,
        message: `Au plus ${LIGNES_MAX} lignes par import : découpez le fichier`,
      });
      break;
    }
    const cellules = decouperLigneCsv(texte, separateur);
    const date = lireDate(cellules[iDate]);
    if (!date) {
      erreurs.push({ ligne: numero, message: 'Date illisible' });
      continue;
    }
    let montant: number | null = null;
    if (iMontant >= 0) {
      montant = lireMontant(cellules[iMontant]);
    } else {
      const credit = iCredit >= 0 ? lireMontant(cellules[iCredit]) : null;
      const debit = iDebit >= 0 ? lireMontant(cellules[iDebit]) : null;
      if (credit) montant = Math.abs(credit);
      else if (debit) montant = -Math.abs(debit);
    }
    if (montant === null || montant === 0) {
      erreurs.push({ ligne: numero, message: 'Montant illisible ou nul' });
      continue;
    }
    lignes.push({
      numero,
      date,
      libelle: (iLibelle >= 0 ? cellules[iLibelle] : '') || 'Sans libellé',
      reference: (iReference >= 0 ? cellules[iReference] : '') || null,
      montant,
    });
  }
  return { lignes, erreurs };
}

const net = (texte: string | null | undefined): string =>
  normaliserMode(texte).replace(/_/g, '');

/**
 * Empreintes des lignes d'un relevé : date, montant, référence et libellé,
 * plus le rang parmi les lignes identiques du même fichier (deux frais
 * bancaires identiques le même jour sont deux lignes). Réimporter le même
 * relevé redonne les mêmes empreintes : rien n'est dupliqué.
 */
export function empreintes(lignes: LigneReleve[]): string[] {
  const vues = new Map<string, number>();
  return lignes.map((l) => {
    const base = `${l.date.toISOString().slice(0, 10)}|${l.montant}|${net(l.reference)}|${net(l.libelle)}`;
    const rang = (vues.get(base) ?? 0) + 1;
    vues.set(base, rang);
    return `${base}#${rang}`;
  });
}

export interface EvenementRapprochable {
  id: string;
  date: Date;
  numero: string;
  libelle: string;
  tiers: string | null;
  reference: string | null;
  entree: number;
  sortie: number;
}

export interface Candidat {
  evenement: EvenementRapprochable;
  /** Plus il est haut, plus le rapprochement est sûr. */
  score: number;
  referenceCommune: boolean;
  ecartJours: number;
}

/** Deux références désignent la même transaction quand l'une contient l'autre (3 caractères au moins). */
function memeReference(a: string | null, b: string | null): boolean {
  const x = net(a);
  const y = net(b);
  if (x.length < 3 || y.length < 3) return false;
  return x.includes(y) || y.includes(x);
}

/** Candidats d'une ligne du relevé : même sens, même montant, dans la fenêtre de dates. */
export function candidats(
  ligne: LigneReleve,
  evenements: EvenementRapprochable[],
  dejaPris: ReadonlySet<string>,
): Candidat[] {
  const resultat: Candidat[] = [];
  for (const evenement of evenements) {
    if (dejaPris.has(evenement.id)) continue;
    const meme =
      ligne.montant > 0
        ? evenement.entree === ligne.montant
        : evenement.sortie === -ligne.montant;
    if (!meme) continue;
    const ecartJours = Math.round(
      Math.abs(ligne.date.getTime() - evenement.date.getTime()) / UN_JOUR,
    );
    if (ecartJours > FENETRE_JOURS) continue;
    const referenceCommune =
      memeReference(ligne.reference, evenement.reference) ||
      memeReference(ligne.reference, evenement.numero);
    resultat.push({
      evenement,
      ecartJours,
      referenceCommune,
      score: 100 - ecartJours * 10 + (referenceCommune ? 50 : 0),
    });
  }
  return resultat.sort((a, b) => b.score - a.score);
}

/**
 * Appariement automatique : seulement quand il n'y a aucune ambiguïté — un
 * seul candidat, ou un seul candidat dont la référence correspond — et que
 * deux lignes du relevé ne se disputent pas le même mouvement. L'ambiguïté se
 * juge sur tous les mouvements libres au départ, pas au fil de l'eau : un
 * rapprochement douteux est pire qu'un rapprochement manquant.
 */
export function appariementAutomatique(
  lignes: Array<LigneReleve & { id: string }>,
  evenements: EvenementRapprochable[],
  dejaPris: ReadonlySet<string>,
): Array<{ ligneId: string; evenementId: string }> {
  const choix: Array<{ ligneId: string; evenementId: string }> = [];
  for (const ligne of lignes) {
    const liste = candidats(ligne, evenements, dejaPris);
    const parReference = liste.filter((c) => c.referenceCommune);
    const choisi =
      liste.length === 1
        ? liste[0]
        : parReference.length === 1
          ? parReference[0]
          : null;
    if (choisi)
      choix.push({ ligneId: ligne.id, evenementId: choisi.evenement.id });
  }
  const demandes = new Map<string, number>();
  for (const c of choix) {
    demandes.set(c.evenementId, (demandes.get(c.evenementId) ?? 0) + 1);
  }
  return choix.filter((c) => demandes.get(c.evenementId) === 1);
}
