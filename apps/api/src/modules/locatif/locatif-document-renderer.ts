import { A4, PdfDocument } from '../../common/pdf/pdf-document';
import { drawEntete, drawPied, type Societe } from '../../common/pdf/societe';
import {
  amountInWords,
  formatDate,
  formatMoney,
} from '../ventes/vente-document-renderer';

/** Données nécessaires à la quittance de loyer remise au locataire. */
export interface QuittanceData {
  reference: string;
  issuedAt: Date;
  company: Societe;
  bien: { referenceInterne: string; adresse: string; commune: string | null };
  locataire: { nom: string; email: string | null; telephone: string | null };
  periode: Date;
  montant: number;
  datePaiement: Date;
  modePaiement: string;
  reference2: string | null;
}

export const NAVY = '#1A4974';
export const NAVY_SUBTLE = '#EAF1F7';
export const ACCENT = '#B52C36';
export const TEXT = '#1F2937';
export const MUTED = '#6B7280';
export const BORDER = '#E5E7EB';
export const SUCCESS = '#047857';

export const MARGIN = 48;
export const CONTENT_WIDTH = A4.width - MARGIN * 2;

const MODE_LABELS: Record<string, string> = {
  especes: 'Espèces',
  virement: 'Virement',
  mobile_money: 'Mobile money',
  cheque: 'Chèque',
  autre: 'Autre',
};

export function moisLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Quittance de loyer : le livrable de l'espace locataire (section 15). */
export function renderQuittance(data: QuittanceData): Buffer {
  const pdf = new PdfDocument(`Quittance de loyer ${data.reference}`);
  const page = pdf.addPage();

  drawEntete(page, data.company);

  const top = 128;
  page.text('QUITTANCE DE LOYER', MARGIN, top + 12, {
    font: 'bold',
    size: 22,
    color: NAVY,
  });
  page.text(`Bien ${data.bien.referenceInterne}`, MARGIN, top + 30, {
    size: 9.5,
    color: MUTED,
  });

  const boxWidth = 200;
  const boxX = A4.width - MARGIN - boxWidth;
  page.rect(boxX, top - 8, boxWidth, 54, NAVY_SUBTLE);
  const labelX = boxX + 12;
  const valueX = boxX + boxWidth - 12;
  page.text('N°', labelX, top + 8, { size: 8.5, color: MUTED });
  page.text(data.reference, valueX, top + 8, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });
  page.text('Émise le', labelX, top + 24, { size: 8.5, color: MUTED });
  page.text(formatDate(data.issuedAt), valueX, top + 24, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });
  page.text('Période', labelX, top + 40, { size: 8.5, color: MUTED });
  page.text(moisLabel(data.periode), valueX, top + 40, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });

  let y = top + 90;
  const gap = 16;
  const width = (CONTENT_WIDTH - gap) / 2;
  const drawBox = (x: number, heading: string, lines: string[]): number => {
    const height = 34 + lines.length * 14;
    page.stroke(x, y, width, height, BORDER);
    page.rect(x, y, width, 22, NAVY_SUBTLE);
    page.text(heading, x + 12, y + 15, {
      font: 'bold',
      size: 8.5,
      color: NAVY,
    });
    let ligneY = y + 38;
    lines.forEach((line, index) => {
      page.text(line, x + 12, ligneY, {
        font: index === 0 ? 'bold' : 'regular',
        size: index === 0 ? 10.5 : 9.5,
        color: index === 0 ? TEXT : MUTED,
        width: width - 24,
      });
      ligneY += 14;
    });
    return height;
  };
  const locataireLines = [
    data.locataire.nom,
    data.locataire.telephone ?? '',
    data.locataire.email ?? '',
  ].filter(Boolean);
  const bienLines = [
    data.bien.adresse,
    [data.bien.referenceInterne, data.bien.commune].filter(Boolean).join(' · '),
  ].filter(Boolean);
  const boxHeight = Math.max(
    drawBox(MARGIN, 'LOCATAIRE', locataireLines),
    drawBox(MARGIN + width + gap, 'BIEN LOUÉ', bienLines),
  );
  y += boxHeight + 30;

  // Montant reçu, mis en avant.
  const highlightHeight = 52;
  page.rect(MARGIN, y, CONTENT_WIDTH, highlightHeight, NAVY_SUBTLE);
  page.rect(MARGIN, y, 4, highlightHeight, SUCCESS);
  page.text('MONTANT REÇU', MARGIN + 18, y + 20, {
    font: 'bold',
    size: 8.5,
    color: MUTED,
  });
  page.text(formatMoney(data.montant), MARGIN + 18, y + 40, {
    font: 'bold',
    size: 16,
    color: SUCCESS,
  });
  y += highlightHeight + 18;

  page.text('Détail du règlement', MARGIN, y + 10, {
    font: 'bold',
    size: 11,
    color: NAVY,
  });
  page.line(MARGIN, y + 16, MARGIN + CONTENT_WIDTH, y + 16, BORDER);
  y += 30;

  const texte = `${data.company.name} reconnaît avoir reçu de ${data.locataire.nom} la somme de ${formatMoney(data.montant)} (${amountInWords(data.montant)}), par ${(MODE_LABELS[data.modePaiement] ?? data.modePaiement).toLowerCase()}${data.reference2 ? ` sous la référence ${data.reference2}` : ''}, le ${formatDate(data.datePaiement)}, au titre du loyer de ${moisLabel(data.periode)} pour le bien situé ${data.bien.adresse}.`;
  const hauteurTexte = page.text(texte, MARGIN, y + 10, {
    size: 9.5,
    color: TEXT,
    width: CONTENT_WIDTH,
    lineHeight: 14.25,
  });
  y += hauteurTexte + 30;

  const signTop = Math.max(y, A4.height - 210);
  const signWidth = (CONTENT_WIDTH - 24) / 2;
  ['Pour MTM Immobilier', 'Le locataire'].forEach((label, index) => {
    const x = MARGIN + index * (signWidth + 24);
    page.stroke(x, signTop, signWidth, 90, BORDER);
    page.text(label, x + 12, signTop + 18, {
      font: 'bold',
      size: 9,
      color: NAVY,
    });
    page.text('Date et signature', x + 12, signTop + 32, {
      size: 8,
      color: MUTED,
    });
  });

  drawPied(
    page,
    data.company,
    `Quittance ${data.reference} — document généré le ${formatDate(data.issuedAt)}`,
  );

  return pdf.build();
}

/**
 * Relevé de gestion remis au propriétaire (backlog J2.1 : « espace
 * propriétaire — loyers, solde, rapports »). Une ligne par mois : ce qui était
 * dû, ce qui a été encaissé, ce qui reste.
 */
export interface ReleveGestionData {
  reference: string;
  issuedAt: Date;
  company: Societe;
  proprietaire: { nom: string; email: string | null };
  bien: {
    referenceInterne: string;
    adresse: string;
    commune: string | null;
    type: string;
  };
  locataire: string | null;
  periodeDebut: Date;
  periodeFin: Date;
  lignes: {
    periode: Date;
    montantPrevu: number;
    montantPaye: number;
    statut: string;
  }[];
  totaux: { du: number; encaisse: number; solde: number };
}

const ECHEANCE_LABELS: Record<string, string> = {
  a_venir: 'À venir',
  partielle: 'Partielle',
  en_retard: 'En retard',
  impayee: 'Impayée',
  payee: 'Payée',
  annulee: 'Annulée',
};

export function renderReleveGestion(data: ReleveGestionData): Buffer {
  const pdf = new PdfDocument(`Relevé de gestion ${data.reference}`);
  const page = pdf.addPage();

  drawEntete(page, data.company);

  const top = 128;
  page.text('RELEVÉ DE GESTION LOCATIVE', MARGIN, top + 12, {
    font: 'bold',
    size: 20,
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
  page.text('N°', boxX + 12, top + 8, { size: 8.5, color: MUTED });
  page.text(data.reference, boxX + boxWidth - 12, top + 8, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });
  page.text('Émis le', boxX + 12, top + 24, { size: 8.5, color: MUTED });
  page.text(formatDate(data.issuedAt), boxX + boxWidth - 12, top + 24, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });
  page.text('Bien', boxX + 12, top + 40, { size: 8.5, color: MUTED });
  page.text(data.bien.referenceInterne, boxX + boxWidth - 12, top + 40, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });

  let y = top + 90;
  const gap = 16;
  const width = (CONTENT_WIDTH - gap) / 2;
  const drawBox = (x: number, heading: string, lines: string[]): number => {
    const height = 34 + lines.length * 14;
    page.stroke(x, y, width, height, BORDER);
    page.rect(x, y, width, 22, NAVY_SUBTLE);
    page.text(heading, x + 12, y + 15, {
      font: 'bold',
      size: 8.5,
      color: NAVY,
    });
    let ligneY = y + 38;
    lines.forEach((line, index) => {
      page.text(line, x + 12, ligneY, {
        font: index === 0 ? 'bold' : 'regular',
        size: index === 0 ? 10.5 : 9.5,
        color: index === 0 ? TEXT : MUTED,
        width: width - 24,
      });
      ligneY += 14;
    });
    return height;
  };
  const boxHeight = Math.max(
    drawBox(
      MARGIN,
      'PROPRIÉTAIRE',
      [data.proprietaire.nom, data.proprietaire.email ?? ''].filter(Boolean),
    ),
    drawBox(
      MARGIN + width + gap,
      'BIEN GÉRÉ',
      [
        data.bien.adresse,
        [data.bien.referenceInterne, data.bien.commune]
          .filter(Boolean)
          .join(' · '),
        data.locataire
          ? `Locataire : ${data.locataire}`
          : 'Aucun locataire en place',
      ].filter(Boolean),
    ),
  );
  y += boxHeight + 26;

  // Tableau des mois.
  const colonnes = [
    { titre: 'Période', x: MARGIN + 12, align: 'left' as const },
    { titre: 'Loyer dû', x: MARGIN + 210, align: 'right' as const },
    { titre: 'Encaissé', x: MARGIN + 330, align: 'right' as const },
    {
      titre: 'Situation',
      x: MARGIN + CONTENT_WIDTH - 12,
      align: 'right' as const,
    },
  ];
  page.rect(MARGIN, y, CONTENT_WIDTH, 22, NAVY_SUBTLE);
  colonnes.forEach((colonne) => {
    page.text(colonne.titre, colonne.x, y + 15, {
      font: 'bold',
      size: 8.5,
      color: NAVY,
      align: colonne.align,
    });
  });
  y += 22;

  const lignes = data.lignes.slice(0, 18);
  lignes.forEach((ligne, index) => {
    if (index % 2 === 1) page.rect(MARGIN, y, CONTENT_WIDTH, 18, '#F8FAFC');
    page.text(moisLabel(ligne.periode), colonnes[0].x, y + 13, {
      size: 9,
      color: TEXT,
    });
    page.text(formatMoney(ligne.montantPrevu), colonnes[1].x, y + 13, {
      size: 9,
      color: TEXT,
      align: 'right',
    });
    page.text(formatMoney(ligne.montantPaye), colonnes[2].x, y + 13, {
      size: 9,
      color: ligne.montantPaye >= ligne.montantPrevu ? SUCCESS : ACCENT,
      align: 'right',
    });
    page.text(
      ECHEANCE_LABELS[ligne.statut] ?? ligne.statut,
      colonnes[3].x,
      y + 13,
      { size: 9, color: MUTED, align: 'right' },
    );
    y += 18;
  });
  page.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y, BORDER);
  y += 16;

  const totaux: [string, number, string][] = [
    ['Total dû sur la période', data.totaux.du, TEXT],
    ['Total encaissé', data.totaux.encaisse, SUCCESS],
    [
      'Solde restant à recouvrer',
      data.totaux.solde,
      data.totaux.solde > 0 ? ACCENT : SUCCESS,
    ],
  ];
  totaux.forEach(([libelle, montant, couleur]) => {
    page.text(libelle, MARGIN + 12, y + 13, { size: 9.5, color: MUTED });
    page.text(formatMoney(montant), MARGIN + CONTENT_WIDTH - 12, y + 13, {
      font: 'bold',
      size: 10,
      color: couleur,
      align: 'right',
    });
    y += 18;
  });

  y += 12;
  page.text(
    'Les dépenses engagées pour le compte du propriétaire et le solde net correspondant seront intégrés au relevé dès la mise en service du module comptabilité.',
    MARGIN,
    y + 10,
    { size: 8.5, color: MUTED, width: CONTENT_WIDTH, lineHeight: 12 },
  );

  drawPied(
    page,
    data.company,
    `Relevé ${data.reference} — document généré le ${formatDate(data.issuedAt)}`,
  );

  return pdf.build();
}
