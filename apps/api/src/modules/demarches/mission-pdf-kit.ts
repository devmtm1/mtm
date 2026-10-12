import {
  A4,
  wrapText,
  type PdfDocument,
  type PdfFont,
} from '../../common/pdf/pdf-document';

/**
 * Briques communes aux documents PDF d'une mission (rapport de vérification,
 * facture) : couleurs, gabarit de page, titres, paragraphes et tableaux.
 */

export const NAVY = '#1A4974';
export const NAVY_DARK = '#233D5B';
export const NAVY_SUBTLE = '#EAF1F7';
export const ACCENT = '#B52C36';
export const TEXT = '#1F2937';
export const MUTED = '#6B7280';
export const BORDER = '#E5E7EB';
export const SUCCESS = '#047857';
export const WARNING = '#B7791F';

export const MARGIN = 48;
export const CONTENT_WIDTH = A4.width - MARGIN * 2;

export type Page = ReturnType<PdfDocument['addPage']>;
export interface Cursor {
  y: number;
}

export function sectionTitle(page: Page, cursor: Cursor, titre: string): void {
  page.text(titre, MARGIN, cursor.y + 10, {
    font: 'bold',
    size: 11,
    color: NAVY,
  });
  page.line(
    MARGIN,
    cursor.y + 16,
    MARGIN + CONTENT_WIDTH,
    cursor.y + 16,
    BORDER,
  );
  cursor.y += 30;
}

export function paragraphe(
  page: Page,
  cursor: Cursor,
  texte: string,
  options: { size?: number; color?: string; font?: PdfFont } = {},
): void {
  const hauteur = page.text(texte, MARGIN, cursor.y + 10, {
    size: options.size ?? 9.5,
    color: options.color ?? TEXT,
    font: options.font,
    width: CONTENT_WIDTH,
    lineHeight: (options.size ?? 9.5) * 1.5,
  });
  cursor.y += hauteur + 12;
}

export interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

export function drawTable(
  page: Page,
  cursor: Cursor,
  colonnes: TableColumn[],
  lignes: string[][],
  options: { totalRows?: number } = {},
): void {
  let y = cursor.y;
  const hauteurLigne = 22;
  page.rect(MARGIN, y, CONTENT_WIDTH, hauteurLigne, NAVY);
  let x = MARGIN;
  for (const colonne of colonnes) {
    const textX = colonne.align === 'right' ? x + colonne.width - 10 : x + 10;
    page.text(colonne.label, textX, y + 15, {
      font: 'bold',
      size: 8.5,
      color: '#FFFFFF',
      align: colonne.align === 'right' ? 'right' : 'left',
    });
    x += colonne.width;
  }
  y += hauteurLigne;
  const totalRows = options.totalRows ?? 0;
  lignes.forEach((ligne, index) => {
    const estTotal = index >= lignes.length - totalRows;
    // Une cellule trop longue passe à la ligne : la rangée grandit avec elle
    // au lieu de déborder sur ce qui suit.
    const lignesTexte = Math.max(
      ...ligne.map(
        (cellule, indexColonne) =>
          wrapText(
            cellule,
            estTotal ? 'bold' : 'regular',
            9.5,
            colonnes[indexColonne].width - 20,
          ).length,
      ),
    );
    const hauteur = Math.max(hauteurLigne, 9 + lignesTexte * 13);
    if (estTotal) page.rect(MARGIN, y, CONTENT_WIDTH, hauteur, NAVY_SUBTLE);
    else if (index % 2 === 1)
      page.rect(MARGIN, y, CONTENT_WIDTH, hauteur, '#F7F8FA');
    let cellX = MARGIN;
    ligne.forEach((cellule, indexColonne) => {
      const colonne = colonnes[indexColonne];
      const textX =
        colonne.align === 'right' ? cellX + colonne.width - 10 : cellX + 10;
      page.text(cellule, textX, y + 15, {
        font: estTotal ? 'bold' : 'regular',
        size: 9.5,
        color: estTotal ? NAVY : TEXT,
        align: colonne.align === 'right' ? 'right' : 'left',
        width: colonne.width - 20,
        lineHeight: 13,
      });
      cellX += colonne.width;
    });
    y += hauteur;
  });
  page.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y, BORDER);
  cursor.y = y + 18;
}

// L'en-tête (logo, coordonnées) et le pied de page (mentions légales) sont communs
// à tous les documents : ils vivent dans common/pdf/societe.ts.
export { drawEntete, drawPied, type Societe } from '../../common/pdf/societe';
