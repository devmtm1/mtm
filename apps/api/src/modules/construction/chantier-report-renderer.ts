import { A4, PdfDocument, type PdfFont } from '../../common/pdf/pdf-document';
import { formatDate, formatMoney } from '../ventes/vente-document-renderer';

/**
 * Rapport d'avancement remis au client (section 16 : « espace client
 * permettant de consulter l'avancement et les rapports autorisés »).
 *
 * Ce document ne montre jamais le budget interne de MTM ni sa marge : le
 * client a signé un devis, il a droit à l'avancement de son chantier et aux
 * journées que MTM a choisi de publier, pas à la structure de coûts de
 * l'entreprise.
 */
export interface ChantierReportData {
  reference: string;
  issuedAt: Date;
  company: {
    name: string;
    tagline: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  projet: {
    intitule: string;
    typeProjet: string;
    programme: string | null;
    adresse: string | null;
    commune: string | null;
    region: string | null;
    surfaceBatie: number | null;
    nombreNiveaux: number | null;
    montantDevis: number | null;
    statut: string;
    avancement: number;
    dateDebutPrevue: Date | null;
    dateFinPrevue: Date | null;
    dateDebutReelle: Date | null;
    dateFinReelle: Date | null;
  };
  client: { nom: string; email: string | null; telephone: string | null };
  terrain: { nom: string; referenceInterne: string | null } | null;
  jalons: Array<{
    libelle: string;
    statut: string;
    avancement: number;
    dateFinPrevue: Date | null;
    dateFinReelle: Date | null;
  }>;
  /** Journées publiées au client, de la plus récente à la plus ancienne. */
  journal: Array<{
    date: Date;
    intervenants: string | null;
    avancement: number | null;
    observations: string | null;
    decisions: string | null;
    prochaineAction: string | null;
  }>;
}

interface Cursor {
  y: number;
}

const MARGE = 48;
const LARGEUR = A4.width - MARGE * 2;
const ENCRE = '#1F2937';
const GRIS = '#6B7280';
const TRAIT = '#E5E7EB';
const ACCENT = '#0F766E';

export function renderChantierReport(data: ChantierReportData): Buffer {
  const pdf = new PdfDocument(`Rapport d’avancement ${data.reference}`);
  let page = pdf.addPage();
  const cursor: Cursor = { y: 0 };

  drawHeader(page, data);
  drawTitre(page, data, cursor);
  drawAvancement(page, data, cursor);
  drawParties(page, data, cursor);
  drawProgramme(page, data, cursor);

  if (data.jalons.length) {
    page = assurerPlace(pdf, page, cursor, 120, data);
    sectionTitle(page, cursor, 'Planning');
    page = drawPlanning(pdf, page, cursor, data);
  }

  if (data.journal.length) {
    page = assurerPlace(pdf, page, cursor, 120, data);
    sectionTitle(page, cursor, 'Journal de chantier');
    for (const journee of data.journal) {
      page = assurerPlace(pdf, page, cursor, 90, data);
      drawJournee(page, cursor, journee);
    }
  }

  page = assurerPlace(pdf, page, cursor, 70, data);
  drawPiedDePage(page, cursor, data);

  return pdf.build();
}

type Page = ReturnType<PdfDocument['addPage']>;

function drawHeader(page: Page, data: ChantierReportData): void {
  page.rect(0, 0, A4.width, 96, '#0B3B36');
  page.text(data.company.name, MARGE, 40, {
    font: 'bold',
    size: 17,
    color: '#FFFFFF',
  });
  page.text(data.company.tagline, MARGE, 58, { size: 9, color: '#9EC9C3' });
  page.text('RAPPORT D’AVANCEMENT', A4.width - MARGE, 40, {
    font: 'bold',
    size: 12,
    color: '#FFFFFF',
    align: 'right',
  });
  page.text(data.reference, A4.width - MARGE, 58, {
    size: 9,
    color: '#9EC9C3',
    align: 'right',
  });
  page.text(`Établi le ${formatDate(data.issuedAt)}`, A4.width - MARGE, 72, {
    size: 9,
    color: '#9EC9C3',
    align: 'right',
  });
}

function drawTitre(page: Page, data: ChantierReportData, cursor: Cursor): void {
  cursor.y = 130;
  cursor.y += page.text(data.projet.intitule, MARGE, cursor.y, {
    font: 'bold',
    size: 15,
    width: LARGEUR,
  });
  const lieu = [data.projet.adresse, data.projet.commune, data.projet.region]
    .filter(Boolean)
    .join(', ');
  if (lieu) {
    cursor.y += page.text(lieu, MARGE, cursor.y + 2, {
      size: 10,
      color: GRIS,
      width: LARGEUR,
    });
  }
  cursor.y += 14;
}

/**
 * La barre d'avancement : c'est la première chose que le client cherche, elle
 * passe donc avant tout le reste.
 */
function drawAvancement(
  page: Page,
  data: ChantierReportData,
  cursor: Cursor,
): void {
  const hauteur = 58;
  page.rect(MARGE, cursor.y, LARGEUR, hauteur, '#F1F5F4');

  const pourcent = Math.min(100, Math.max(0, data.projet.avancement));
  page.text('AVANCEMENT DU CHANTIER', MARGE + 14, cursor.y + 18, {
    font: 'bold',
    size: 8,
    color: GRIS,
  });
  page.text(`${pourcent} %`, A4.width - MARGE - 14, cursor.y + 20, {
    font: 'bold',
    size: 14,
    color: ACCENT,
    align: 'right',
  });

  const barreX = MARGE + 14;
  const barreLargeur = LARGEUR - 28;
  page.rect(barreX, cursor.y + 30, barreLargeur, 10, '#DDE5E3');
  if (pourcent > 0) {
    page.rect(
      barreX,
      cursor.y + 30,
      (barreLargeur * pourcent) / 100,
      10,
      ACCENT,
    );
  }

  page.text(libelle(data.projet.statut), barreX, cursor.y + 52, {
    size: 9,
    color: GRIS,
  });

  cursor.y += hauteur + 18;
}

function drawParties(
  page: Page,
  data: ChantierReportData,
  cursor: Cursor,
): void {
  const colonne = LARGEUR / 2 - 10;
  const depart = cursor.y;

  let gauche = depart;
  gauche += page.text('CLIENT', MARGE, gauche, {
    font: 'bold',
    size: 8,
    color: GRIS,
  });
  gauche += page.text(data.client.nom, MARGE, gauche + 2, {
    font: 'bold',
    size: 10,
    width: colonne,
  });
  for (const ligne of [data.client.telephone, data.client.email]) {
    if (ligne) {
      gauche += page.text(ligne, MARGE, gauche, { size: 9, color: GRIS });
    }
  }

  const xDroite = MARGE + LARGEUR / 2 + 10;
  let droite = depart;
  droite += page.text('TERRAIN', xDroite, droite, {
    font: 'bold',
    size: 8,
    color: GRIS,
  });
  droite += page.text(
    data.terrain?.nom ?? 'Terrain du client',
    xDroite,
    droite + 2,
    {
      font: 'bold',
      size: 10,
      width: colonne,
    },
  );
  if (data.terrain?.referenceInterne) {
    droite += page.text(data.terrain.referenceInterne, xDroite, droite, {
      size: 9,
      color: GRIS,
    });
  }

  cursor.y = Math.max(gauche, droite) + 16;
}

function drawProgramme(
  page: Page,
  data: ChantierReportData,
  cursor: Cursor,
): void {
  sectionTitle(page, cursor, 'Le projet');

  const faits: Array<[string, string]> = [
    ['Nature', libelle(data.projet.typeProjet)],
    [
      'Surface bâtie',
      data.projet.surfaceBatie ? `${data.projet.surfaceBatie} m²` : '—',
    ],
    ['Niveaux', data.projet.nombreNiveaux?.toString() ?? '—'],
    [
      'Montant du devis',
      data.projet.montantDevis ? formatMoney(data.projet.montantDevis) : '—',
    ],
    [
      'Début',
      formatDate(data.projet.dateDebutReelle ?? data.projet.dateDebutPrevue) ||
        '—',
    ],
    [
      'Fin prévue',
      formatDate(data.projet.dateFinReelle ?? data.projet.dateFinPrevue) || '—',
    ],
  ];

  const colonnes = 3;
  const largeurCase = LARGEUR / colonnes;
  faits.forEach(([etiquette, valeur], index) => {
    const x = MARGE + (index % colonnes) * largeurCase;
    const y = cursor.y + Math.floor(index / colonnes) * 34;
    page.text(etiquette.toUpperCase(), x, y, {
      font: 'bold',
      size: 7.5,
      color: GRIS,
    });
    page.text(valeur, x, y + 14, { size: 10, width: largeurCase - 12 });
  });
  cursor.y += Math.ceil(faits.length / colonnes) * 34 + 10;

  if (data.projet.programme) {
    cursor.y += page.text(data.projet.programme, MARGE, cursor.y, {
      size: 10,
      width: LARGEUR,
    });
    cursor.y += 10;
  }
}

/** Le planning en tableau : libellé, échéance, état, avancement. */
function drawPlanning(
  pdf: PdfDocument,
  pageInitiale: Page,
  cursor: Cursor,
  data: ChantierReportData,
): Page {
  let page = pageInitiale;
  const colonnes = [MARGE, MARGE + 250, MARGE + 350, MARGE + 440];

  const entete = (cible: Page) => {
    cible.rect(MARGE, cursor.y, LARGEUR, 20, '#F3F4F6');
    const libelles = ['Étape', 'Échéance', 'État', 'Avancement'];
    libelles.forEach((texte, index) => {
      cible.text(texte.toUpperCase(), colonnes[index] + 6, cursor.y + 14, {
        font: 'bold',
        size: 7.5,
        color: GRIS,
      });
    });
    cursor.y += 20;
  };

  entete(page);

  for (const jalon of data.jalons) {
    if (cursor.y > A4.height - 110) {
      page = nouvellePage(pdf, cursor, data);
      entete(page);
    }
    const echeance =
      formatDate(jalon.dateFinReelle ?? jalon.dateFinPrevue) || '—';
    page.text(jalon.libelle, colonnes[0] + 6, cursor.y + 13, {
      size: 9.5,
      width: 238,
    });
    page.text(echeance, colonnes[1] + 6, cursor.y + 13, {
      size: 9.5,
      color: GRIS,
    });
    page.text(libelle(jalon.statut), colonnes[2] + 6, cursor.y + 13, {
      size: 9.5,
      color: jalon.statut === 'termine' ? ACCENT : ENCRE,
    });
    page.text(
      `${jalon.statut === 'termine' ? 100 : jalon.avancement} %`,
      colonnes[3] + 6,
      cursor.y + 13,
      { size: 9.5 },
    );
    cursor.y += 20;
    page.line(MARGE, cursor.y, MARGE + LARGEUR, cursor.y, TRAIT, 0.5);
  }

  cursor.y += 14;
  return page;
}

function drawJournee(
  page: Page,
  cursor: Cursor,
  journee: ChantierReportData['journal'][number],
): void {
  page.rect(MARGE, cursor.y, 3, 16, ACCENT);
  page.text(formatDate(journee.date), MARGE + 12, cursor.y + 12, {
    font: 'bold',
    size: 10,
  });
  if (journee.avancement !== null) {
    page.text(`${journee.avancement} %`, A4.width - MARGE, cursor.y + 12, {
      size: 9.5,
      color: ACCENT,
      align: 'right',
    });
  }
  cursor.y += 20;

  if (journee.intervenants) {
    cursor.y += page.text(
      `Sur place : ${journee.intervenants}`,
      MARGE + 12,
      cursor.y,
      { size: 9, color: GRIS, width: LARGEUR - 12 },
    );
  }
  for (const texte of [
    journee.observations,
    journee.decisions,
    journee.prochaineAction
      ? `Prochaine étape : ${journee.prochaineAction}`
      : null,
  ]) {
    if (texte) {
      cursor.y += page.text(texte, MARGE + 12, cursor.y + 2, {
        size: 9.5,
        width: LARGEUR - 12,
      });
    }
  }
  cursor.y += 12;
}

function drawPiedDePage(
  page: Page,
  cursor: Cursor,
  data: ChantierReportData,
): void {
  page.line(MARGE, cursor.y, MARGE + LARGEUR, cursor.y, TRAIT);
  cursor.y += 12;
  page.text(
    `${data.company.name} — ${data.company.adresse} — ${data.company.telephone} — ${data.company.email}`,
    MARGE,
    cursor.y,
    { size: 8, color: GRIS, width: LARGEUR },
  );
  cursor.y += 14;
  page.text(
    'Ce rapport présente l’avancement constaté à la date d’établissement. Il ne vaut pas procès-verbal de réception.',
    MARGE,
    cursor.y,
    { size: 8, color: GRIS, width: LARGEUR },
  );
}

function sectionTitle(page: Page, cursor: Cursor, titre: string): void {
  cursor.y += page.text(titre.toUpperCase(), MARGE, cursor.y, {
    font: 'bold' as PdfFont,
    size: 9,
    color: ACCENT,
  });
  page.line(MARGE, cursor.y + 2, MARGE + LARGEUR, cursor.y + 2, TRAIT);
  cursor.y += 14;
}

/** Ouvre une page si la place manque pour le bloc qui vient. */
function assurerPlace(
  pdf: PdfDocument,
  page: Page,
  cursor: Cursor,
  hauteur: number,
  data: ChantierReportData,
): Page {
  if (cursor.y + hauteur < A4.height - 70) return page;
  return nouvellePage(pdf, cursor, data);
}

function nouvellePage(
  pdf: PdfDocument,
  cursor: Cursor,
  data: ChantierReportData,
): Page {
  const page = pdf.addPage();
  page.rect(0, 0, A4.width, 40, '#0B3B36');
  page.text(`${data.company.name} — ${data.reference}`, MARGE, 26, {
    size: 9,
    color: '#9EC9C3',
  });
  cursor.y = 70;
  return page;
}

/** « second_oeuvre » se lit mieux en « Second oeuvre ». */
function libelle(code: string | null): string {
  if (!code) return '—';
  const texte = code.replace(/_/g, ' ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
