import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { parserCsv } from './terrain-import';

/** Au-delà, le fichier n'est plus un tableur de biens : on le refuse plutôt que de le charger. */
export const MAX_LIGNES_IMPORT = 5000;
export const MAX_COLONNES_IMPORT = 40;
export const MAX_TAILLE_IMPORT = 5 * 1024 * 1024;

export interface Tableur {
  feuilles: string[];
  feuille: string;
  lignes: string[][];
}

const jj = (n: number) => String(n).padStart(2, '0');

/** Valeur d'une cellule Excel sous forme de texte, comme l'affiche le tableur. */
function enTexte(valeur: ExcelJS.CellValue): string {
  if (valeur === null || valeur === undefined) return '';
  if (valeur instanceof Date) {
    // Les dates Excel sont stockées en UTC : lire le jour local décalerait la date.
    return `${jj(valeur.getUTCDate())}/${jj(valeur.getUTCMonth() + 1)}/${valeur.getUTCFullYear()}`;
  }
  if (typeof valeur === 'object') {
    if ('richText' in valeur)
      return valeur.richText.map((p) => p.text).join('');
    if ('result' in valeur) return enTexte(valeur.result);
    if ('text' in valeur) {
      return typeof valeur.text === 'string'
        ? valeur.text
        : enTexte(valeur.text);
    }
    if ('error' in valeur) return '';
  }
  if (typeof valeur === 'string') return valeur;
  if (typeof valeur === 'number' || typeof valeur === 'boolean') {
    return String(valeur);
  }
  return '';
}

/**
 * Lit un fichier `.xlsx` ou `.csv` en tableau de textes. Le contenu n'est
 * jamais interprété (ni formule, ni macro) : seules les valeurs sont lues.
 * Un classeur peut compter plusieurs onglets (« BD officielle », « ARCHIVES »…) ;
 * `feuille` choisit celui à lire, le premier par défaut.
 */
export async function lireTableur(
  fichier: { buffer: Buffer; originalname: string },
  feuille?: string,
): Promise<Tableur> {
  const nom = fichier.originalname.toLowerCase();

  if (nom.endsWith('.csv')) {
    const lignes = parserCsv(fichier.buffer.toString('utf-8'));
    verifierTaille(lignes);
    return { feuilles: ['CSV'], feuille: 'CSV', lignes };
  }

  if (nom.endsWith('.xls')) {
    throw new BadRequestException(
      'Le format .xls (ancien Excel) n’est pas pris en charge : enregistrez le fichier au format .xlsx puis recommencez',
    );
  }
  if (!nom.endsWith('.xlsx')) {
    throw new BadRequestException(
      'Format non reconnu : déposez un fichier Excel (.xlsx) ou CSV (.csv)',
    );
  }
  // Un .xlsx est une archive ZIP : sa signature la distingue d'un fichier
  // renommé, avant de confier quoi que ce soit au lecteur.
  if (fichier.buffer.subarray(0, 2).toString('latin1') !== 'PK') {
    throw new BadRequestException(
      'Ce fichier n’est pas un classeur Excel valide (.xlsx)',
    );
  }

  const classeur = new ExcelJS.Workbook();
  try {
    await classeur.xlsx.load(fichier.buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new BadRequestException(
      'Impossible de lire ce classeur : il est peut-être protégé par un mot de passe ou endommagé',
    );
  }

  const feuilles = classeur.worksheets.map((w) => w.name);
  if (feuilles.length === 0) {
    throw new BadRequestException('Le classeur ne contient aucun onglet');
  }
  const choisie = feuille ?? feuilles[0];
  const onglet = classeur.getWorksheet(choisie);
  if (!onglet) {
    throw new BadRequestException(
      `Onglet « ${choisie} » introuvable. Onglets disponibles : ${feuilles.join(', ')}`,
    );
  }
  if (onglet.rowCount > MAX_LIGNES_IMPORT) {
    throw new BadRequestException(
      `L’onglet compte ${onglet.rowCount} lignes : la limite est de ${MAX_LIGNES_IMPORT} par import. Scindez le fichier.`,
    );
  }

  const colonnes = Math.min(onglet.columnCount, MAX_COLONNES_IMPORT);
  const lignes: string[][] = [];
  for (let r = 1; r <= onglet.rowCount; r++) {
    const ligne = onglet.getRow(r);
    const cellules: string[] = [];
    for (let c = 1; c <= colonnes; c++) {
      cellules.push(enTexte(ligne.getCell(c).value).trim());
    }
    lignes.push(cellules);
  }
  return { feuilles, feuille: choisie, lignes };
}

function verifierTaille(lignes: string[][]): void {
  if (lignes.length > MAX_LIGNES_IMPORT) {
    throw new BadRequestException(
      `Le fichier compte ${lignes.length} lignes : la limite est de ${MAX_LIGNES_IMPORT} par import. Scindez le fichier.`,
    );
  }
}
