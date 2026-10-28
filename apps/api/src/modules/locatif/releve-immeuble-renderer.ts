import { A4, PdfDocument } from '../../common/pdf/pdf-document';
import { drawEntete, drawPied, type Societe } from '../../common/pdf/societe';
import { formatDate, formatMoney } from '../ventes/vente-document-renderer';
import {
  ACCENT,
  BORDER,
  CONTENT_WIDTH,
  MARGIN,
  MUTED,
  NAVY,
  NAVY_SUBTLE,
  SUCCESS,
  TEXT,
  moisLabel,
} from './locatif-document-renderer';
import {
  LIBELLES_REPARTITION,
  type ReleveImmeubleCalcule,
} from './releve-immeuble.helper';

export interface ReleveImmeubleData extends ReleveImmeubleCalcule {
  reference: string;
  issuedAt: Date;
  company: Societe;
  proprietaire: { nom: string; email: string | null };
  immeuble: {
    nom: string;
    typeLibelle: string;
    adresse: string;
    commune: string | null;
    referenceInterne: string;
  };
  periodeDebut: Date;
  periodeFin: Date;
}

const HAUTEUR_LIGNE = 18;
/** En deçà, on passe à la page suivante : le tableau ne doit pas toucher le pied de page. */
const BAS_DE_PAGE = A4.height - 90;

/**
 * Relevé de gestion unique d'une propriété : le propriétaire lit sa villa comme un seul bien. Un tableau par
 * logement (loyer dû, encaissé, solde, part des charges), la liste des charges communes de la période, puis le net
 * qui lui revient avant la commission de gestion.
 */
export function renderReleveImmeuble(data: ReleveImmeubleData): Buffer {
  const pdf = new PdfDocument(`Relevé de gestion ${data.reference}`);
  let page = pdf.addPage();
  const pages = [page];
  drawEntete(page, data.company);

  const top = 128;
  page.text('RELEVÉ DE LA PROPRIÉTÉ', MARGIN, top + 12, {
    font: 'bold',
    size: 18,
    color: NAVY,
  });
  page.text(
    `${moisLabel(data.periodeDebut)} au ${moisLabel(data.periodeFin)}`,
    MARGIN,
    top + 30,
    { size: 9.5, color: MUTED },
  );

  const boxWidth = 200;
  const boxX = A4.width - MARGIN - boxWidth;
  page.rect(boxX, top - 8, boxWidth, 54, NAVY_SUBTLE);
  const ligneBoite = (libelle: string, valeur: string, y: number) => {
    page.text(libelle, boxX + 12, y, { size: 8.5, color: MUTED });
    page.text(valeur, boxX + boxWidth - 12, y, {
      font: 'bold',
      size: 9.5,
      color: TEXT,
      align: 'right',
    });
  };
  ligneBoite('N°', data.reference, top + 8);
  ligneBoite('Émis le', formatDate(data.issuedAt), top + 24);
  ligneBoite('Propriété', data.immeuble.referenceInterne, top + 40);

  let y = top + 70;
  page.text(data.proprietaire.nom, MARGIN, y + 10, {
    font: 'bold',
    size: 11,
    color: TEXT,
  });
  page.text(
    [
      data.immeuble.nom,
      data.immeuble.typeLibelle,
      [data.immeuble.adresse, data.immeuble.commune].filter(Boolean).join(', '),
    ]
      .filter(Boolean)
      .join(' · '),
    MARGIN,
    y + 26,
    { size: 9.5, color: MUTED, width: CONTENT_WIDTH },
  );
  y += 50;

  /** Passe à une nouvelle page quand il ne reste plus la place d'une ligne. */
  const assurerPlace = (hauteur: number) => {
    if (y + hauteur <= BAS_DE_PAGE) return;
    page = pdf.addPage();
    pages.push(page);
    drawEntete(page, data.company);
    y = 128;
  };

  // --- Les logements ---
  page.text('LOYERS PAR LOGEMENT', MARGIN, y + 10, {
    font: 'bold',
    size: 9,
    color: NAVY,
  });
  y += 18;
  const colonnes = [
    { titre: 'Logement', x: MARGIN + 12, align: 'left' as const },
    { titre: 'Loyer dû', x: MARGIN + 250, align: 'right' as const },
    { titre: 'Encaissé', x: MARGIN + 345, align: 'right' as const },
    { titre: 'Solde', x: MARGIN + 425, align: 'right' as const },
    {
      titre: 'Charges',
      x: MARGIN + CONTENT_WIDTH - 12,
      align: 'right' as const,
    },
  ];
  page.rect(MARGIN, y, CONTENT_WIDTH, 22, NAVY_SUBTLE);
  colonnes.forEach((c) =>
    page.text(c.titre, c.x, y + 15, {
      font: 'bold',
      size: 8.5,
      color: NAVY,
      align: c.align,
    }),
  );
  y += 22;

  data.logements.forEach((logement, index) => {
    assurerPlace(HAUTEUR_LIGNE + 4);
    if (index % 2 === 1)
      page.rect(MARGIN, y, CONTENT_WIDTH, HAUTEUR_LIGNE, '#F8FAFC');
    page.text(
      logement.locataire
        ? `${logement.libelle} — ${logement.locataire}`
        : `${logement.libelle} — sans locataire`,
      colonnes[0].x,
      y + 13,
      { size: 9, color: TEXT, width: 180 },
    );
    page.text(formatMoney(logement.du), colonnes[1].x, y + 13, {
      size: 9,
      color: TEXT,
      align: 'right',
    });
    page.text(formatMoney(logement.encaisse), colonnes[2].x, y + 13, {
      size: 9,
      color: logement.encaisse >= logement.du ? SUCCESS : ACCENT,
      align: 'right',
    });
    page.text(formatMoney(logement.solde), colonnes[3].x, y + 13, {
      size: 9,
      color: logement.solde > 0 ? ACCENT : MUTED,
      align: 'right',
    });
    page.text(formatMoney(logement.chargesImputees), colonnes[4].x, y + 13, {
      size: 9,
      color: MUTED,
      align: 'right',
    });
    y += HAUTEUR_LIGNE;
  });
  page.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y, BORDER);
  y += 22;

  // --- Les charges communes ---
  assurerPlace(60);
  page.text('CHARGES COMMUNES DE LA PÉRIODE', MARGIN, y + 10, {
    font: 'bold',
    size: 9,
    color: NAVY,
  });
  y += 18;
  if (data.charges.length === 0) {
    page.text(
      'Aucune charge commune enregistrée sur la période.',
      MARGIN + 12,
      y + 10,
      { size: 9, color: MUTED },
    );
    y += 24;
  } else {
    data.charges.forEach((charge, index) => {
      assurerPlace(HAUTEUR_LIGNE + 4);
      if (index % 2 === 1)
        page.rect(MARGIN, y, CONTENT_WIDTH, HAUTEUR_LIGNE, '#F8FAFC');
      page.text(formatDate(charge.dateCharge), MARGIN + 12, y + 13, {
        size: 9,
        color: MUTED,
      });
      page.text(charge.libelle, MARGIN + 100, y + 13, {
        size: 9,
        color: TEXT,
        width: 240,
      });
      page.text(
        LIBELLES_REPARTITION[charge.repartition],
        MARGIN + 395,
        y + 13,
        { size: 8.5, color: MUTED, align: 'right' },
      );
      page.text(
        formatMoney(charge.montant),
        MARGIN + CONTENT_WIDTH - 12,
        y + 13,
        { size: 9, color: TEXT, align: 'right' },
      );
      y += HAUTEUR_LIGNE;
    });
    page.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y, BORDER);
    y += 14;
  }

  // --- Les totaux ---
  assurerPlace(110);
  const totaux: [string, number, string, boolean][] = [
    ['Loyers dus sur la période', data.totalDu, TEXT, false],
    ['Loyers encaissés', data.totalEncaisse, SUCCESS, false],
    [
      'Reste à recouvrer',
      data.totalSolde,
      data.totalSolde > 0 ? ACCENT : SUCCESS,
      false,
    ],
    ['Charges communes', -data.totalCharges, MUTED, false],
    ['Net revenant au propriétaire', data.net, NAVY, true],
  ];
  totaux.forEach(([libelle, montant, couleur, fort]) => {
    if (fort) {
      page.rect(MARGIN, y, CONTENT_WIDTH, 26, NAVY_SUBTLE);
      page.text(libelle, MARGIN + 12, y + 17, {
        font: 'bold',
        size: 10.5,
        color: NAVY,
      });
      page.text(formatMoney(montant), MARGIN + CONTENT_WIDTH - 12, y + 17, {
        font: 'bold',
        size: 12,
        color: couleur,
        align: 'right',
      });
      y += 30;
      return;
    }
    page.text(libelle, MARGIN + 12, y + 13, { size: 9.5, color: MUTED });
    page.text(formatMoney(montant), MARGIN + CONTENT_WIDTH - 12, y + 13, {
      font: 'bold',
      size: 10,
      color: couleur,
      align: 'right',
    });
    y += 18;
  });
  y += 8;
  page.text(
    'Le net est calculé avant la commission de gestion de MTM. Les charges communes sont à la charge du propriétaire ; leur répartition entre logements n’en change pas le total.',
    MARGIN,
    y + 10,
    { size: 8.5, color: MUTED, width: CONTENT_WIDTH, lineHeight: 12 },
  );

  pages.forEach((p, index) =>
    drawPied(
      p,
      data.company,
      `Relevé ${data.reference} — page ${index + 1}/${pages.length} — généré le ${formatDate(data.issuedAt)}`,
    ),
  );
  return pdf.build();
}
