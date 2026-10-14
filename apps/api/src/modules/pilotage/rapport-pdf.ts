import { A4, PdfDocument, wrapText } from '../../common/pdf/pdf-document';
import { drawEntete, drawPied, type Societe } from '../../common/pdf/societe';
import {
  type ColonneRapport,
  type RapportDonnees,
  type SectionRapport,
  texteCellule,
} from './pilotage.calculs';

const NAVY = '#1A4974';
const NAVY_SUBTLE = '#EAF1F7';
const TEXT = '#1F2937';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const MARGE = 40;
const LARGEUR = A4.width - MARGE * 2;
/** Au-delà de cette hauteur, on change de page : le pied de page tient dans le reste. */
const BAS_DE_PAGE = A4.height - 84;
const TAILLE = 8;
const INTERLIGNE = 10.5;
const HAUTEUR_ENTETE = 20;

type Page = ReturnType<PdfDocument['addPage']>;

/** Poids relatif de chaque type de colonne : le texte prend plus de place, les nombres moins. */
const POIDS: Record<ColonneRapport['type'], number> = {
  texte: 2.2,
  date: 1.3,
  nombre: 0.95,
  pourcentage: 0.95,
  montant: 1.35,
};

export function largeursColonnes(colonnes: ColonneRapport[]): number[] {
  const total = colonnes.reduce((somme, c) => somme + POIDS[c.type], 0);
  return colonnes.map((c) => (POIDS[c.type] / total) * LARGEUR);
}

/**
 * Rapport imprimable : en-tête et pied de page de MTM (logo, mentions
 * légales), indicateurs clés, puis chaque tableau avec ses totaux. Les
 * tableaux passent d'une page à l'autre et reprennent leur ligne de titres.
 */
export function renderRapportPdf(
  rapport: RapportDonnees,
  societe: Societe,
): Buffer {
  const pdf = new PdfDocument(rapport.titre);
  const pages: Page[] = [];

  const nouvellePage = (): { page: Page; y: number } => {
    const page = pdf.addPage();
    pages.push(page);
    drawEntete(page, societe, { hauteur: 74 });
    return { page, y: 98 };
  };

  let { page, y } = nouvellePage();

  // --- Titre et période ---
  page.text(rapport.titre.toUpperCase(), MARGE, y + 8, {
    font: 'bold',
    size: 15,
    color: NAVY,
  });
  y += 24;
  page.text(rapport.sousTitre, MARGE, y + 4, {
    size: 9.5,
    color: MUTED,
    width: LARGEUR,
  });
  y += 26;

  // --- Indicateurs clés ---
  if (rapport.resume.length > 0) {
    const nb = Math.min(rapport.resume.length, 4);
    const gouttiere = 8;
    const largeurCase = (LARGEUR - gouttiere * (nb - 1)) / nb;
    const lignesResume = Math.ceil(rapport.resume.length / nb);
    for (let ligne = 0; ligne < lignesResume; ligne += 1) {
      rapport.resume
        .slice(ligne * nb, ligne * nb + nb)
        .forEach((indicateur, i) => {
          const x = MARGE + i * (largeurCase + gouttiere);
          page.rect(x, y, largeurCase, 44, NAVY_SUBTLE);
          page.text(indicateur.libelle, x + 8, y + 15, {
            size: 7.5,
            color: MUTED,
            width: largeurCase - 16,
          });
          page.text(indicateur.valeur, x + 8, y + 33, {
            font: 'bold',
            size: 11,
            color: NAVY,
            width: largeurCase - 16,
          });
        });
      y += 52;
    }
    y += 6;
  }

  const verifierPlace = (hauteur: number): void => {
    if (y + hauteur > BAS_DE_PAGE) ({ page, y } = nouvellePage());
  };

  // --- Sections ---
  for (const section of rapport.sections) {
    verifierPlace(HAUTEUR_ENTETE + 60);
    page.text(section.titre, MARGE, y + 10, {
      font: 'bold',
      size: 11,
      color: NAVY,
      width: LARGEUR,
    });
    y += 20;
    y = dessinerSection(
      section,
      () => ({ page, y }),
      (p, ny) => {
        page = p;
        y = ny;
      },
      verifierPlace,
      nouvellePage,
    );
    y += 8;
  }

  // --- Pied de page : numéro de page sur chaque feuille ---
  const total = pages.length;
  pages.forEach((p, index) => {
    drawPied(
      p,
      societe,
      `${rapport.titre} — page ${index + 1}/${total} — édité le ${new Date().toLocaleDateString('fr-FR')}`,
    );
  });

  return pdf.build();
}

function dessinerSection(
  section: SectionRapport,
  courant: () => { page: Page; y: number },
  appliquer: (page: Page, y: number) => void,
  verifierPlace: (hauteur: number) => void,
  nouvellePage: () => { page: Page; y: number },
): number {
  const largeurs = largeursColonnes(section.colonnes);

  const entete = (): void => {
    const { page, y } = courant();
    page.rect(MARGE, y, LARGEUR, HAUTEUR_ENTETE, NAVY);
    let x = MARGE;
    section.colonnes.forEach((colonne, i) => {
      const droite = colonne.type !== 'texte' && colonne.type !== 'date';
      page.text(colonne.libelle, droite ? x + largeurs[i] - 5 : x + 5, y + 13, {
        font: 'bold',
        size: 7.5,
        color: '#FFFFFF',
        align: droite ? 'right' : 'left',
        width: largeurs[i] - 10,
        lineHeight: 9,
      });
      x += largeurs[i];
    });
    appliquer(page, y + HAUTEUR_ENTETE);
  };

  if (section.lignes.length === 0) {
    const { page, y } = courant();
    page.text('Aucune donnée sur cette période.', MARGE, y + 8, {
      size: 9,
      color: MUTED,
    });
    appliquer(page, y + 22);
    return courant().y;
  }

  entete();
  const lignes = [...section.lignes.map((l) => ({ valeurs: l, total: false }))];
  if (section.total) lignes.push({ valeurs: section.total, total: true });

  lignes.forEach(({ valeurs, total }, index) => {
    const police = total ? 'bold' : 'regular';
    const cellules = section.colonnes.map((c) =>
      texteCellule(valeurs[c.cle], c.type),
    );
    const nbLignes = Math.max(
      1,
      ...cellules.map(
        (texte, i) => wrapText(texte, police, TAILLE, largeurs[i] - 10).length,
      ),
    );
    const hauteur = Math.max(17, 6 + nbLignes * INTERLIGNE);
    if (courant().y + hauteur > BAS_DE_PAGE) {
      const suivante = nouvellePage();
      appliquer(suivante.page, suivante.y);
      entete();
    }
    const { page, y } = courant();
    if (total) page.rect(MARGE, y, LARGEUR, hauteur, NAVY_SUBTLE);
    else if (index % 2 === 1) page.rect(MARGE, y, LARGEUR, hauteur, '#F7F8FA');
    let x = MARGE;
    section.colonnes.forEach((colonne, i) => {
      const droite = colonne.type !== 'texte' && colonne.type !== 'date';
      page.text(cellules[i], droite ? x + largeurs[i] - 5 : x + 5, y + 11.5, {
        font: police,
        size: TAILLE,
        color: total ? NAVY : TEXT,
        align: droite ? 'right' : 'left',
        width: largeurs[i] - 10,
        lineHeight: INTERLIGNE,
      });
      x += largeurs[i];
    });
    appliquer(page, y + hauteur);
  });

  const { page, y } = courant();
  page.line(MARGE, y, MARGE + LARGEUR, y, BORDER);
  let fin = y + 12;
  if (section.note) {
    verifierPlace(30);
    const apres = courant();
    const hauteurNote =
      wrapText(section.note, 'regular', 7.5, LARGEUR).length * 9.5;
    apres.page.text(section.note, MARGE, apres.y + 18, {
      size: 7.5,
      color: MUTED,
      width: LARGEUR,
      lineHeight: 9.5,
    });
    fin = apres.y + 18 + hauteurNote + 6;
    appliquer(apres.page, fin);
    return fin;
  }
  appliquer(page, fin);
  return fin;
}
