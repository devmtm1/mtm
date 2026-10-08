import ExcelJS from 'exceljs';
import { lireTableur, MAX_LIGNES_IMPORT } from './lecture-tableur';
import { preparerImport, trouverEntete } from './terrain-import';

async function classeur(
  remplir: (wb: ExcelJS.Workbook) => void,
): Promise<{ buffer: Buffer; originalname: string }> {
  const wb = new ExcelJS.Workbook();
  remplir(wb);
  const donnees = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(donnees), originalname: 'bd-terrains.xlsx' };
}

const ENTETE = [
  'N°',
  'MATRICUL',
  'LOCALITE',
  'Nbre T',
  'TITRE JURIDIQUE',
  'PRIX DE CESSION',
  'PRIX',
  'PROPRIETAIRE /MANDATAIRE',
  'TELEPHONE',
  'VENDU',
  'SURFACE',
  'MODALITE DE PAIEMENT',
  'DATE ENTREE',
];

describe('lireTableur', () => {
  it('retrouve l’en-tête sous des lignes de titre, comme dans le tableur de MTM', async () => {
    const fichier = await classeur((wb) => {
      const ws = wb.addWorksheet('BD officielle');
      ws.addRow(['Bd terrains MTM IMMO - Officiel']);
      ws.addRow([]);
      ws.addRow(ENTETE);
      ws.addRow([
        1,
        'KNL001',
        'Keur ndiaye lo',
        1,
        'Délibération',
        7000000,
        8000000,
        'Maty KHOULE',
        '77 712 35 20',
        'DISPONIBLE',
        '150m²',
        'cash',
        new Date(Date.UTC(2026, 6, 7)),
      ]);
    });

    const tableur = await lireTableur(fichier);
    expect(tableur.feuilles).toEqual(['BD officielle']);
    expect(trouverEntete(tableur.lignes)).toBe(2);

    const rapport = preparerImport(tableur.lignes, {
      titresAutorises: ['Délibération'],
      modalitesAutorisees: ['Cash', 'Moratoire'],
      statutsVisiteAutorises: ['À visiter'],
      publierDisponibles: false,
      archives: false,
    });
    expect(rapport.refuses).toEqual([]);
    expect(rapport.biens).toHaveLength(1);
    expect(rapport.biens[0]).toMatchObject({
      // Numéro de ligne tel qu'affiché dans Excel : en-tête ligne 3, bien ligne 4.
      ligne: 4,
      referenceInterne: 'KNL001',
      prixCession: 7_000_000,
      prixPublic: 8_000_000,
      modalitePaiement: 'Cash',
      // La date Excel est lue en UTC : pas de décalage d'un jour.
      dateEntree: '2026-07-07',
    });
  });

  it('lit l’onglet demandé d’un classeur à plusieurs onglets', async () => {
    const fichier = await classeur((wb) => {
      wb.addWorksheet('BD officielle').addRow(ENTETE);
      const archives = wb.addWorksheet('ARCHIVES');
      archives.addRow(ENTETE);
      archives.addRow([2, 'OLD1', 'Ancien site', 1, 'Bail']);
    });

    const premier = await lireTableur(fichier);
    expect(premier.feuille).toBe('BD officielle');
    expect(premier.feuilles).toEqual(['BD officielle', 'ARCHIVES']);

    const archives = await lireTableur(fichier, 'ARCHIVES');
    expect(archives.lignes[1][1]).toBe('OLD1');
  });

  it('lit le résultat d’une formule plutôt que la formule', async () => {
    const fichier = await classeur((wb) => {
      const ws = wb.addWorksheet('F');
      ws.addRow(ENTETE);
      ws.addRow([1, 'F1', 'Thiès', 1, 'Bail']);
      ws.getCell('F2').value = { formula: '3000000+500000', result: 3500000 };
    });
    const tableur = await lireTableur(fichier);
    expect(tableur.lignes[1][5]).toBe('3500000');
  });

  it('refuse un onglet inconnu en disant lesquels existent', async () => {
    const fichier = await classeur((wb) => wb.addWorksheet('A').addRow(['x']));
    await expect(lireTableur(fichier, 'B')).rejects.toThrow(
      'Onglets disponibles : A',
    );
  });

  it('lit aussi un CSV', async () => {
    const tableur = await lireTableur({
      buffer: Buffer.from('LOCALITE;TITRE JURIDIQUE\nThiès;Bail\n'),
      originalname: 'export.csv',
    });
    expect(tableur.lignes).toEqual([
      ['LOCALITE', 'TITRE JURIDIQUE'],
      ['Thiès', 'Bail'],
    ]);
  });

  it('refuse un faux .xlsx, l’ancien .xls et un format inconnu', async () => {
    await expect(
      lireTableur({ buffer: Buffer.from('pas un zip'), originalname: 'a.xlsx' }),
    ).rejects.toThrow('pas un classeur Excel valide');
    await expect(
      lireTableur({ buffer: Buffer.from('x'), originalname: 'a.xls' }),
    ).rejects.toThrow('.xlsx');
    await expect(
      lireTableur({ buffer: Buffer.from('x'), originalname: 'a.pdf' }),
    ).rejects.toThrow('Format non reconnu');
  });

  it('refuse un classeur corrompu sans exposer d’erreur interne', async () => {
    await expect(
      lireTableur({
        buffer: Buffer.from('PK-corrompu'),
        originalname: 'a.xlsx',
      }),
    ).rejects.toThrow('Impossible de lire ce classeur');
  });

  it('refuse un fichier démesuré plutôt que de le charger', async () => {
    const lignes = `A;B\n${'x;y\n'.repeat(MAX_LIGNES_IMPORT + 1)}`;
    await expect(
      lireTableur({ buffer: Buffer.from(lignes), originalname: 'gros.csv' }),
    ).rejects.toThrow('la limite est de');
  });
});
