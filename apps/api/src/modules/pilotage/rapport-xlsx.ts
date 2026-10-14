import ExcelJS from 'exceljs';
import {
  type Cellule,
  type ColonneRapport,
  type RapportDonnees,
} from './pilotage.calculs';

/** Une cellule qui commence par = + - @ serait exécutée comme formule à l'ouverture du classeur. */
function neutre(valeur: string): string {
  return /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
}

/** Nom d'onglet valide : 31 caractères au plus, sans les caractères interdits par Excel. */
export function nomOnglet(titre: string, deja: Set<string>): string {
  const base =
    titre
      .replace(/[\\/?*[\]:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 28) || 'Feuille';
  let nom = base;
  let n = 2;
  while (deja.has(nom.toLowerCase())) {
    nom = `${base.slice(0, 28 - String(n).length - 1)} ${n}`;
    n += 1;
  }
  deja.add(nom.toLowerCase());
  return nom;
}

function valeurExcel(
  valeur: Cellule | undefined,
  type: ColonneRapport['type'],
): ExcelJS.CellValue {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  switch (type) {
    case 'montant':
    case 'nombre':
      return Number(valeur);
    // Excel range un pourcentage en fraction : 12,5 % se stocke 0,125.
    case 'pourcentage':
      return Number(valeur) / 100;
    case 'date': {
      const date = new Date(String(valeur));
      return Number.isNaN(date.getTime()) ? neutre(String(valeur)) : date;
    }
    default:
      return neutre(String(valeur));
  }
}

const FORMATS: Partial<Record<ColonneRapport['type'], string>> = {
  montant: '#,##0',
  nombre: '#,##0',
  pourcentage: '0.0%',
  date: 'dd/mm/yyyy',
};

/**
 * Classeur Excel d'un rapport : un onglet « Synthèse » (titre, période,
 * indicateurs) puis un onglet par tableau, avec de vrais nombres, dates et
 * pourcentages — pas du texte — pour que le comptable puisse trier et totaliser.
 */
export async function renderRapportXlsx(
  rapport: RapportDonnees,
): Promise<Buffer> {
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'MTM Immobilier';
  classeur.created = new Date();
  const noms = new Set<string>();

  const synthese = classeur.addWorksheet(nomOnglet('Synthèse', noms));
  synthese.columns = [
    { header: '', key: 'a', width: 34 },
    { header: '', key: 'b', width: 40 },
  ];
  synthese.addRow([rapport.titre]).font = { bold: true, size: 14 };
  synthese.addRow([rapport.sousTitre]);
  synthese.addRow([]);
  for (const indicateur of rapport.resume) {
    const ligne = synthese.addRow([indicateur.libelle, indicateur.valeur]);
    ligne.getCell(1).font = { bold: true };
  }
  synthese.addRow([]);
  synthese.addRow([
    `Édité le ${new Date().toLocaleDateString('fr-FR')} — MTM Immobilier`,
  ]);

  for (const section of rapport.sections) {
    const feuille = classeur.addWorksheet(nomOnglet(section.titre, noms));
    feuille.columns = section.colonnes.map((c) => ({
      header: c.libelle,
      key: c.cle,
      width: c.type === 'texte' ? 32 : c.type === 'date' ? 13 : 18,
      style: FORMATS[c.type] ? { numFmt: FORMATS[c.type] } : {},
    }));
    for (const ligne of section.lignes) {
      feuille.addRow(
        Object.fromEntries(
          section.colonnes.map((c) => [
            c.cle,
            valeurExcel(ligne[c.cle], c.type),
          ]),
        ),
      );
    }
    if (section.total) {
      feuille.addRow(
        Object.fromEntries(
          section.colonnes.map((c) => [
            c.cle,
            valeurExcel(section.total?.[c.cle], c.type),
          ]),
        ),
      ).font = { bold: true };
    }
    feuille.getRow(1).font = { bold: true };
    feuille.views = [{ state: 'frozen', ySplit: 1 }];
    if (section.note) {
      feuille.addRow([]);
      feuille.addRow([section.note]);
    }
  }
  return Buffer.from(await classeur.xlsx.writeBuffer());
}
