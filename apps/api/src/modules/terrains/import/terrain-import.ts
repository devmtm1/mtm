/**
 * Reprise du tableur « Bd terrains MTM IMMO » (export CSV de Google Sheets).
 *
 * Le tableur est saisi à la main : un même titre y existe en « Deliberation »,
 * « DELIBERATION » et « Délibération », les prix s'écrivent « 2 million 700 »
 * ou « 3 000 000/3 500 000 », les surfaces « 7 Ha » ou « 225m²/300m² ».
 * Ce module ne contient que de la logique pure (aucun accès base) : il lit,
 * normalise et signale. Il ne devine jamais — une valeur ambiguë est écartée
 * et rapportée, la ligne n'est refusée que si une donnée obligatoire manque.
 */

/** Séparateur le plus fréquent de la première ligne (`;` d'un Excel français, `,`, tabulation). */
export function detecterSeparateur(texte: string): string {
  const premiere = texte.split(/\r?\n/, 1)[0] ?? '';
  const candidats = [';', ',', '\t'];
  return candidats
    .map((c) => ({ c, n: premiere.split(c).length - 1 }))
    .sort((a, b) => b.n - a.n)[0].c;
}

/** CSV minimal conforme RFC 4180 : guillemets, séparateurs et sauts de ligne dans une cellule. */
export function parserCsv(texte: string, separateur?: string): string[][] {
  const sep = separateur ?? detecterSeparateur(texte);
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = '';
  let entreGuillemets = false;
  const source = texte.replace(/^\uFEFF/, '');

  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (entreGuillemets) {
      if (c === '"' && source[i + 1] === '"') {
        cellule += '"';
        i++;
      } else if (c === '"') {
        entreGuillemets = false;
      } else {
        cellule += c;
      }
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === sep) {
      ligne.push(cellule);
      cellule = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++;
      ligne.push(cellule);
      cellule = '';
      lignes.push(ligne);
      ligne = [];
    } else {
      cellule += c;
    }
  }
  if (cellule !== '' || ligne.length > 0) {
    ligne.push(cellule);
    lignes.push(ligne);
  }
  return lignes;
}

/** Minuscules, sans accents ni ponctuation : sert à comparer des libellés saisis librement. */
export function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type ChampImport =
  | 'numero'
  | 'matricule'
  | 'localite'
  | 'nombreLots'
  | 'titre'
  | 'images'
  | 'prixCession'
  | 'prix'
  | 'contactNom'
  | 'contactTelephone'
  | 'disponibilite'
  | 'surface'
  | 'modalitePaiement'
  | 'dateEntree'
  | 'direct'
  | 'protocole';

/** En-tête du tableur (normalisé, sans espaces) → champ de l'application. */
const ENTETES: Array<[RegExp, ChampImport]> = [
  [/^n$|^no$|^numero$/, 'numero'],
  [/^matricul/, 'matricule'],
  [/^localite/, 'localite'],
  [/^nbre ?t|^nombre ?(de )?(terrains|lots)/, 'nombreLots'],
  [/^titre/, 'titre'],
  [/^images?/, 'images'],
  [/^prix ?de ?cession/, 'prixCession'],
  [/^prix$/, 'prix'],
  [/^proprietaire|^mandataire/, 'contactNom'],
  [/^tel/, 'contactTelephone'],
  [/^vendu|^disponib|^statut/, 'disponibilite'],
  [/^surface|^superficie/, 'surface'],
  [/^modalite/, 'modalitePaiement'],
  [/^date ?entree/, 'dateEntree'],
  [/^direct/, 'direct'],
  [/^protocole/, 'protocole'],
];

export function cartographierEntetes(
  entetes: string[],
): Partial<Record<ChampImport, number>> {
  const carte: Partial<Record<ChampImport, number>> = {};
  entetes.forEach((brut, index) => {
    const cle = normaliser(brut).replace(/ +/g, ' ');
    const trouve = ENTETES.find(([motif]) => motif.test(cle));
    if (trouve && carte[trouve[1]] === undefined) carte[trouve[1]] = index;
  });
  return carte;
}

/** Montant en francs CFA : « 7 000 000 », « 10 million », « 2 million 700 ». */
export function lireMontant(brut: string | undefined): {
  valeur: number | null;
  avertissement?: string;
} {
  const texte = (brut ?? '').trim();
  if (!texte) return { valeur: null };
  const min = texte.toLowerCase();

  // Intervalle « 3 000 000/3 500 000 » : on ne tranche pas, on garde la
  // première valeur et on le signale pour que MTM arbitre.
  if (/[/-]/.test(min) && /\d/.test(min.split(/[/-]/)[1] ?? '')) {
    const premier = lireMontant(min.split(/[/-]/)[0]);
    return {
      valeur: premier.valeur,
      avertissement: `intervalle de prix « ${texte} » : première valeur retenue`,
    };
  }

  const million = min.match(/^(\d+(?:[.,]\d+)?)\s*millions?(?:\s*(\d+))?$/);
  if (million) {
    const base = Number(million[1].replace(',', '.')) * 1_000_000;
    const reste = million[2] ? Number(million[2]) * 1000 : 0;
    return { valeur: Math.round(base + reste) };
  }

  const chiffres = min.replace(/[\s.\u00a0\u202f]/g, '');
  if (/^\d+$/.test(chiffres)) {
    const valeur = Number(chiffres);
    // « 3 500 00 » : groupes de chiffres incohérents, c'est une faute de frappe.
    const groupes = min.split(/[\s\u00a0\u202f]+/);
    const coherent =
      groupes.length === 1 ||
      groupes.slice(1).every((groupe) => groupe.length === 3);
    return coherent
      ? { valeur }
      : {
          valeur: null,
          avertissement: `montant illisible « ${texte} » : à ressaisir`,
        };
  }
  return {
    valeur: null,
    avertissement: `montant illisible « ${texte} » : à ressaisir`,
  };
}

/** Surface en m² : « 150m² », « 150m2 », « 7 Ha », « 225m²/300m² », « 150 ». */
export function lireSurface(brut: string | undefined): {
  valeur: number | null;
  avertissement?: string;
} {
  const texte = (brut ?? '').trim();
  if (!texte || texte === '?') return { valeur: null };
  const min = texte.toLowerCase().replace(/[\u00a0\u202f]/g, ' ');
  const premiere = min.split('/')[0];
  const nombre = premiere.match(/(\d+(?:[.,]\d+)?)/);
  if (!nombre) {
    return {
      valeur: null,
      avertissement: `surface illisible « ${texte} » : à ressaisir`,
    };
  }
  let valeur = Number(nombre[1].replace(',', '.'));
  if (/\bha\b|hectare/.test(premiere)) valeur *= 10_000;
  const avertissement = min.includes('/')
    ? `surface en intervalle « ${texte} » : première valeur retenue`
    : undefined;
  return { valeur, avertissement };
}

/** « 07/07/2026 » ou « 2026-07-07 » → « 2026-07-07 » ; sinon `null`. */
export function lireDate(brut: string | undefined): string | null {
  const texte = (brut ?? '').trim();
  if (!texte) return null;
  const fr = texte.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const iso = texte.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [j, m, a] = fr
    ? [fr[1], fr[2], fr[3]]
    : iso
      ? [iso[3], iso[2], iso[1]]
      : [null, null, null];
  if (!j || !m || !a) return null;
  const jour = Number(j);
  const mois = Number(m);
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  return `${a}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
}

/** Téléphone : conserve chiffres et « + » ; « DG » ou texte libre ne sont pas des numéros. */
export function lireTelephone(brut: string | undefined): string | null {
  const texte = (brut ?? '').trim();
  if (!texte) return null;
  const nettoye = texte.replace(/[^\d+]/g, '');
  return nettoye.replace(/\D/g, '').length >= 7 ? nettoye : null;
}

/**
 * Titre juridique du tableur → valeur de la liste configurable. Les valeurs
 * reconnues sont limitées à celles de `autorises` : un titre que MTM n'a pas
 * paramétré n'est jamais inventé, la ligne est refusée.
 */
export function normaliserTitre(
  brut: string | undefined,
  autorises: readonly string[],
): string | null {
  const cle = normaliser(brut ?? '');
  if (!cle) return null;
  let cible: string | null = null;
  if (/^del\w*ration/.test(cle)) {
    cible = cle.includes('nicad')
      ? 'Délibération NICAD'
      : /double|tamp/.test(cle)
        ? 'Délibération double tampon'
        : 'Délibération';
  } else if (cle.includes('bail')) {
    cible = cle.includes('individuel') ? 'Bail individuel' : 'Bail';
  } else if (cle.includes('notification')) {
    cible = 'Notification de bail';
  } else if (cle.includes('titre')) {
    cible = 'Titre foncier';
  }
  return cible && autorises.includes(cible) ? cible : null;
}

export function normaliserModalite(
  brut: string | undefined,
  autorises: readonly string[],
): string | null {
  const cle = normaliser(brut ?? '');
  if (!cle) return null;
  const cible = cle.startsWith('cash')
    ? 'Cash'
    : cle.startsWith('morato')
      ? 'Moratoire'
      : null;
  return cible && autorises.includes(cible) ? cible : null;
}

/** Colonne « Vendu » du tableur : disponibilité et suivi de visite sont mêlés. */
export function lireDisponibilite(
  brut: string | undefined,
  autorisesVisite: readonly string[],
): { disponible: boolean; vendu: boolean; statutVisite: string | null } {
  const cle = normaliser(brut ?? '');
  const aVisiter = /visit/.test(cle);
  const statutVisite = aVisiter
    ? (autorisesVisite.find((s) => normaliser(s).startsWith('a visiter')) ??
      null)
    : null;
  return {
    vendu: /^vendu/.test(cle),
    disponible: cle.includes('disponible'),
    statutVisite,
  };
}

export interface OptionsImport {
  titresAutorises: readonly string[];
  modalitesAutorisees: readonly string[];
  statutsVisiteAutorises: readonly string[];
  /** `Disponible` publie le bien sur le site : réservé à un choix explicite. */
  publierDisponibles: boolean;
  /** Onglet ARCHIVES : les biens sont repris déjà archivés. */
  archives: boolean;
}

export interface BienImporte {
  ligne: number;
  referenceInterne: string;
  nom: string;
  parcelleMatricule?: string;
  localisationDetail: string;
  statutJuridique: string;
  statutCommercial: string;
  niveauVerification: string;
  nombreLots?: number;
  superficie?: number;
  uniteSuperficie?: string;
  prixCession?: number;
  prixPublic?: number;
  contactVendeurNom?: string;
  contactVendeurTelephone?: string;
  modalitePaiement?: string;
  dateEntree?: string;
  produitDirect: boolean;
  protocoleAccord: boolean;
  statutVisite?: string;
  notesInternes?: string;
  archive: boolean;
}

export interface RapportImport {
  biens: BienImporte[];
  refuses: Array<{ ligne: number; raison: string }>;
  avertissements: Array<{ ligne: number; message: string }>;
  ignorees: number;
}

const OUI = /^(oui|o|x|yes|1|true|ok)$/;

/**
 * Transforme les lignes du tableur en biens prêts à créer. `lignes[0]` est
 * l'en-tête ; les numéros de ligne du rapport sont ceux du tableur.
 */
export function preparerImport(
  lignes: string[][],
  options: OptionsImport,
): RapportImport {
  const rapport: RapportImport = {
    biens: [],
    refuses: [],
    avertissements: [],
    ignorees: 0,
  };
  if (lignes.length === 0) return rapport;
  const carte = cartographierEntetes(lignes[0]);
  if (carte.titre === undefined || carte.localite === undefined) {
    rapport.refuses.push({
      ligne: 1,
      raison:
        'En-têtes introuvables : les colonnes « LOCALITE » et « TITRE JURIDIQUE » sont indispensables',
    });
    return rapport;
  }
  const cellule = (ligne: string[], champ: ChampImport): string | undefined =>
    carte[champ] === undefined ? undefined : ligne[carte[champ]]?.trim();

  const refsPrises = new Set<string>();
  lignes.slice(1).forEach((ligne, index) => {
    const numeroLigne = index + 2;
    if (ligne.every((c) => !c.trim())) {
      rapport.ignorees++;
      return;
    }
    const avertir = (message: string) =>
      rapport.avertissements.push({ ligne: numeroLigne, message });
    const refuser = (raison: string) =>
      rapport.refuses.push({ ligne: numeroLigne, raison });

    const localite = cellule(ligne, 'localite');
    if (!localite) return refuser('localité absente');

    const titreBrut = cellule(ligne, 'titre');
    const titre = normaliserTitre(titreBrut, options.titresAutorises);
    if (!titre) {
      return refuser(
        titreBrut
          ? `titre juridique non reconnu « ${titreBrut} » : à ajouter aux paramètres ou à corriger`
          : 'titre juridique absent',
      );
    }

    const matricule = cellule(ligne, 'matricule') || undefined;
    let reference = matricule ?? `IMP-L${numeroLigne}`;
    if (refsPrises.has(reference.toLowerCase())) {
      avertir(`matricule « ${reference} » déjà utilisé plus haut`);
      reference = `${reference}-L${numeroLigne}`;
    }
    refsPrises.add(reference.toLowerCase());

    const notes: string[] = [];
    const montantPrix = lireMontant(cellule(ligne, 'prix'));
    if (montantPrix.avertissement) {
      avertir(montantPrix.avertissement);
      notes.push(`Prix saisi dans le tableur : ${cellule(ligne, 'prix')}`);
    }
    const montantCession = lireMontant(cellule(ligne, 'prixCession'));
    if (montantCession.avertissement) {
      avertir(montantCession.avertissement);
      notes.push(
        `Prix de cession saisi dans le tableur : ${cellule(ligne, 'prixCession')}`,
      );
    }
    const surface = lireSurface(cellule(ligne, 'surface'));
    if (surface.avertissement) {
      avertir(surface.avertissement);
      notes.push(
        `Surface saisie dans le tableur : ${cellule(ligne, 'surface')}`,
      );
    }

    const lotsBruts = cellule(ligne, 'nombreLots');
    let nombreLots: number | undefined;
    if (lotsBruts) {
      if (/^\d+$/.test(lotsBruts) && Number(lotsBruts) > 0) {
        nombreLots = Number(lotsBruts);
      } else {
        avertir(`nombre de lots illisible « ${lotsBruts} » : ignoré`);
        notes.push(`Nombre de terrains saisi dans le tableur : ${lotsBruts}`);
      }
    }

    const modaliteBrute = cellule(ligne, 'modalitePaiement');
    const modalite = normaliserModalite(
      modaliteBrute,
      options.modalitesAutorisees,
    );
    if (modaliteBrute && !modalite) {
      avertir(
        `modalité de paiement non reconnue « ${modaliteBrute} » : ignorée`,
      );
    }

    const dateBrute = cellule(ligne, 'dateEntree');
    const dateEntree = lireDate(dateBrute);
    if (dateBrute && !dateEntree) {
      avertir(`date d'entrée illisible « ${dateBrute} » : ignorée`);
    }

    const telBrut = cellule(ligne, 'contactTelephone');
    const telephone = lireTelephone(telBrut);
    if (telBrut && !telephone) {
      avertir(`téléphone non exploitable « ${telBrut} » : ignoré`);
      notes.push(`Téléphone saisi dans le tableur : ${telBrut}`);
    }

    const dispo = lireDisponibilite(
      cellule(ligne, 'disponibilite'),
      options.statutsVisiteAutorises,
    );
    // Un import ne publie rien sans demande explicite : une ligne « Disponible »
    // du tableur ne doit pas apparaître d'un coup sur le site, photos absentes.
    const statutCommercial = dispo.vendu
      ? 'Vendu'
      : dispo.disponible && options.publierDisponibles
        ? 'Disponible'
        : 'Brouillon';

    rapport.biens.push({
      ligne: numeroLigne,
      referenceInterne: reference,
      nom: localite.slice(0, 200),
      parcelleMatricule: matricule,
      localisationDetail: localite,
      statutJuridique: titre,
      statutCommercial,
      niveauVerification: 'Non vérifié',
      nombreLots,
      superficie: surface.valeur ?? undefined,
      uniteSuperficie: surface.valeur === null ? undefined : 'm²',
      prixCession: montantCession.valeur ?? undefined,
      prixPublic: montantPrix.valeur ?? undefined,
      contactVendeurNom: cellule(ligne, 'contactNom') || undefined,
      contactVendeurTelephone: telephone ?? undefined,
      modalitePaiement: modalite ?? undefined,
      dateEntree: dateEntree ?? undefined,
      produitDirect: Boolean(cellule(ligne, 'direct')),
      protocoleAccord: OUI.test(normaliser(cellule(ligne, 'protocole') ?? '')),
      statutVisite: dispo.statutVisite ?? undefined,
      notesInternes: notes.length ? notes.join('\n') : undefined,
      archive: options.archives,
    });
  });
  return rapport;
}
