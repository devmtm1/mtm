import { A4, PdfDocument, type PdfFont } from '../../common/pdf/pdf-document';

/** Données d'un dossier nécessaires aux documents générés. */
export interface VenteDocumentData {
  type: string;
  title: string;
  reference: string;
  issuedAt: Date;
  company: {
    name: string;
    tagline: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  dossier: {
    referenceInterne: string | null;
    statut: string;
    prixVente: number | null;
    createdAt: Date;
  };
  client: { nom: string; email: string | null; telephone: string | null };
  terrain: {
    nom: string;
    referenceInterne: string | null;
    commune: string | null;
    region: string | null;
    localisationDetail: string | null;
    superficie: number | null;
    uniteSuperficie: string | null;
  } | null;
  reservation: {
    reference: string | null;
    montantAcompte: number;
    dateDebut: Date;
    dateExpiration: Date;
    statut: string;
  } | null;
  paiements: Array<{
    montant: number;
    datePaiement: Date;
    mode: string;
    reference: string | null;
    statut: string;
  }>;
  echeances: Array<{
    numero: number;
    dateEcheance: Date;
    montantPrevu: number;
    montantPaye: number;
    statut: string;
  }>;
}

const NAVY = '#1A4974';
const NAVY_DARK = '#233D5B';
const NAVY_SUBTLE = '#EAF1F7';
const ACCENT = '#B52C36';
const TEXT = '#1F2937';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const SUCCESS = '#047857';

const MARGIN = 48;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const PAYMENT_MODES: Record<string, string> = {
  especes: 'Espèces',
  virement: 'Virement',
  en_ligne: 'Paiement en ligne',
  cheque: 'Chèque',
  mobile_money: 'Mobile money',
  acompte: 'Acompte de réservation',
};

const DOSSIER_STATUS: Record<string, string> = {
  en_cours: 'En cours',
  pre_reserve: 'Pré-réservé',
  reserve: 'Réservé',
  paiement_partiel: 'Paiement partiel',
  solde: 'Soldé',
  annule: 'Annulé',
};

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

export function formatDate(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function modeLabel(mode: string): string {
  return PAYMENT_MODES[mode] ?? mode.replace(/_/g, ' ');
}

/** Montant en toutes lettres (francs CFA), pour les reçus et contrats. */
export function amountInWords(value: number): string {
  const units = [
    'zéro',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
    'dix-sept',
    'dix-huit',
    'dix-neuf',
  ];
  const tens = [
    '',
    '',
    'vingt',
    'trente',
    'quarante',
    'cinquante',
    'soixante',
    'soixante',
    'quatre-vingt',
    'quatre-vingt',
  ];
  const below100 = (n: number): string => {
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9)
      return `${tens[t]}-${units[10 + u]}`.replace(
        'soixante-onze',
        'soixante et onze',
      );
    if (u === 0) return t === 8 ? 'quatre-vingts' : tens[t];
    if (u === 1 && t !== 8) return `${tens[t]} et un`;
    return `${tens[t]}-${units[u]}`;
  };
  const below1000 = (n: number): string => {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let out = '';
    if (h === 1) out = 'cent';
    else if (h > 1) out = `${units[h]} cent${rest === 0 ? 's' : ''}`;
    if (rest > 0) out = out ? `${out} ${below100(rest)}` : below100(rest);
    return out;
  };
  const n = Math.round(Math.abs(value));
  if (n === 0) return 'zéro franc CFA';
  const parts: string[] = [];
  const scales: Array<[number, string, string]> = [
    [1_000_000_000, 'milliard', 'milliards'],
    [1_000_000, 'million', 'millions'],
    [1_000, 'mille', 'mille'],
  ];
  let remaining = n;
  for (const [scale, singular, plural] of scales) {
    const count = Math.floor(remaining / scale);
    if (count > 0) {
      if (scale === 1_000 && count === 1) parts.push('mille');
      else parts.push(`${below1000(count)} ${count > 1 ? plural : singular}`);
      remaining %= scale;
    }
  }
  if (remaining > 0) parts.push(below1000(remaining));
  return `${parts.join(' ')} francs CFA`;
}

interface Cursor {
  y: number;
}

/**
 * Documents de vente au design MTM : bandeau marine, coordonnées, cartouche
 * client / terrain, tableaux et pied de page. Une fonction par type.
 */
export function renderVenteDocument(data: VenteDocumentData): Buffer {
  const pdf = new PdfDocument(`${data.title} ${data.reference}`);
  const page = pdf.addPage();
  const cursor: Cursor = { y: 0 };

  drawHeader(page, data);
  drawTitle(page, data, cursor);
  drawParties(page, data, cursor);

  switch (data.type) {
    case 'recu':
      drawRecu(page, data, cursor);
      break;
    case 'bon_reservation':
      drawBonReservation(page, data, cursor);
      break;
    case 'contrat':
      drawContrat(page, data, cursor);
      break;
    case 'etat_paiement':
      drawEtatPaiement(page, data, cursor);
      break;
    default:
      drawFacture(page, data, cursor);
  }

  drawFooter(page, data);
  return pdf.build();
}

type Page = ReturnType<PdfDocument['addPage']>;

function drawHeader(page: Page, data: VenteDocumentData): void {
  page.rect(0, 0, A4.width, 92, NAVY);
  page.rect(0, 92, A4.width, 4, ACCENT);
  page.text(data.company.name.toUpperCase(), MARGIN, 44, {
    font: 'bold',
    size: 20,
    color: '#FFFFFF',
  });
  page.text(data.company.tagline, MARGIN, 62, { size: 9, color: '#CFE0EE' });
  const right = A4.width - MARGIN;
  page.text(data.company.adresse, right, 40, {
    size: 9,
    color: '#FFFFFF',
    align: 'right',
  });
  page.text(data.company.telephone, right, 54, {
    size: 9,
    color: '#FFFFFF',
    align: 'right',
  });
  page.text(data.company.email, right, 68, {
    size: 9,
    color: '#FFFFFF',
    align: 'right',
  });
}

function drawTitle(page: Page, data: VenteDocumentData, cursor: Cursor): void {
  const top = 128;
  page.text(data.title.toUpperCase(), MARGIN, top + 12, {
    font: 'bold',
    size: 22,
    color: NAVY,
  });
  page.text(
    `Dossier ${data.dossier.referenceInterne ?? '—'} · ${DOSSIER_STATUS[data.dossier.statut] ?? data.dossier.statut}`,
    MARGIN,
    top + 30,
    { size: 9.5, color: MUTED },
  );

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
  page.text('Date d’émission', labelX, top + 24, { size: 8.5, color: MUTED });
  page.text(formatDate(data.issuedAt), valueX, top + 24, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });
  page.text('Dossier ouvert le', labelX, top + 40, { size: 8.5, color: MUTED });
  page.text(formatDate(data.dossier.createdAt), valueX, top + 40, {
    font: 'bold',
    size: 9.5,
    color: TEXT,
    align: 'right',
  });

  cursor.y = top + 72;
}

function drawParties(
  page: Page,
  data: VenteDocumentData,
  cursor: Cursor,
): void {
  const gap = 16;
  const width = (CONTENT_WIDTH - gap) / 2;
  const top = cursor.y;
  const clientLines = [
    data.client.nom,
    data.client.telephone ?? '',
    data.client.email ?? '',
  ].filter(Boolean);
  const terrain = data.terrain;
  const location = terrain
    ? [terrain.commune, terrain.region].filter(Boolean).join(', ')
    : '';
  const terrainLines = terrain
    ? [
        terrain.nom,
        [
          terrain.referenceInterne ? `Réf. ${terrain.referenceInterne}` : '',
          location,
        ]
          .filter(Boolean)
          .join(' · '),
        terrain.superficie
          ? `${Math.round(terrain.superficie)
              .toString()
              .replace(
                /\B(?=(\d{3})+(?!\d))/g,
                ' ',
              )} ${terrain.uniteSuperficie ?? 'm²'}`
          : '',
        terrain.localisationDetail ?? '',
      ].filter(Boolean)
    : ['Terrain non encore rattaché au dossier'];
  const rows = Math.max(clientLines.length, terrainLines.length);
  const height = 34 + rows * 14;

  const drawBox = (
    x: number,
    heading: string,
    lines: string[],
    first: PdfFont,
  ): void => {
    page.stroke(x, top, width, height, BORDER);
    page.rect(x, top, width, 22, NAVY_SUBTLE);
    page.text(heading, x + 12, top + 15, {
      font: 'bold',
      size: 8.5,
      color: NAVY,
    });
    let y = top + 38;
    lines.forEach((line, index) => {
      page.text(line, x + 12, y, {
        font: index === 0 ? first : 'regular',
        size: index === 0 ? 10.5 : 9.5,
        color: index === 0 ? TEXT : MUTED,
        width: width - 24,
      });
      y += 14;
    });
  };
  drawBox(MARGIN, 'CLIENT', clientLines, 'bold');
  drawBox(MARGIN + width + gap, 'TERRAIN', terrainLines, 'bold');
  cursor.y = top + height + 22;
}

interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

function drawTable(
  page: Page,
  cursor: Cursor,
  columns: TableColumn[],
  rows: string[][],
  options: { totalRows?: number } = {},
): void {
  let y = cursor.y;
  const rowHeight = 22;
  page.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, NAVY);
  let x = MARGIN;
  for (const column of columns) {
    const textX = column.align === 'right' ? x + column.width - 10 : x + 10;
    page.text(column.label, textX, y + 15, {
      font: 'bold',
      size: 8.5,
      color: '#FFFFFF',
      align: column.align === 'right' ? 'right' : 'left',
    });
    x += column.width;
  }
  y += rowHeight;
  const totalRows = options.totalRows ?? 0;
  rows.forEach((row, index) => {
    const isTotal = index >= rows.length - totalRows;
    if (isTotal) page.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, NAVY_SUBTLE);
    else if (index % 2 === 1)
      page.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, '#F7F8FA');
    let cellX = MARGIN;
    row.forEach((cell, columnIndex) => {
      const column = columns[columnIndex];
      const textX =
        column.align === 'right' ? cellX + column.width - 10 : cellX + 10;
      page.text(cell, textX, y + 15, {
        font: isTotal ? 'bold' : 'regular',
        size: 9.5,
        color: isTotal ? NAVY : TEXT,
        align: column.align === 'right' ? 'right' : 'left',
      });
      cellX += column.width;
    });
    y += rowHeight;
  });
  page.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y, BORDER);
  cursor.y = y + 18;
}

function sectionTitle(page: Page, cursor: Cursor, title: string): void {
  page.text(title, MARGIN, cursor.y + 10, {
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

function paragraph(
  page: Page,
  cursor: Cursor,
  text: string,
  options: { size?: number; color?: string; font?: PdfFont } = {},
): void {
  const height = page.text(text, MARGIN, cursor.y + 10, {
    size: options.size ?? 9.5,
    color: options.color ?? TEXT,
    font: options.font,
    width: CONTENT_WIDTH,
    lineHeight: (options.size ?? 9.5) * 1.5,
  });
  cursor.y += height + 14;
}

function totals(data: VenteDocumentData): {
  prix: number;
  paye: number;
  reste: number;
} {
  const prix = data.dossier.prixVente ?? 0;
  const paye = data.paiements
    .filter((p) => p.statut === 'valide')
    .reduce((sum, p) => sum + p.montant, 0);
  return { prix, paye, reste: Math.max(0, prix - paye) };
}

function drawFacture(
  page: Page,
  data: VenteDocumentData,
  cursor: Cursor,
): void {
  const { prix, paye, reste } = totals(data);
  sectionTitle(page, cursor, 'Détail');
  const rows: string[][] = [
    [
      `${data.terrain?.nom ?? 'Terrain'}${data.terrain?.referenceInterne ? ` (${data.terrain.referenceInterne})` : ''} — prix de vente convenu`,
      formatMoney(prix),
    ],
  ];
  const validated = data.paiements.filter((p) => p.statut === 'valide');
  for (const payment of validated) {
    rows.push([
      `Versement du ${formatDate(payment.datePaiement)} · ${modeLabel(payment.mode)}${payment.reference ? ` · réf. ${payment.reference}` : ''}`,
      `- ${formatMoney(payment.montant)}`,
    ]);
  }
  rows.push(['Total payé', formatMoney(paye)]);
  rows.push(['Reste à payer', formatMoney(reste)]);
  drawTable(
    page,
    cursor,
    [
      { label: 'Désignation', width: CONTENT_WIDTH - 150 },
      { label: 'Montant', width: 150, align: 'right' },
    ],
    rows,
    { totalRows: 2 },
  );

  drawAmountHighlight(
    page,
    cursor,
    reste > 0 ? 'Montant restant dû' : 'Dossier soldé',
    formatMoney(reste),
    reste > 0 ? NAVY : SUCCESS,
  );
  if (data.echeances.length > 0) {
    sectionTitle(page, cursor, 'Échéancier');
    drawTable(
      page,
      cursor,
      [
        { label: 'N°', width: 40 },
        { label: 'Échéance', width: 150 },
        { label: 'Prévu', width: 120, align: 'right' },
        { label: 'Payé', width: 120, align: 'right' },
        { label: 'Statut', width: CONTENT_WIDTH - 430 },
      ],
      data.echeances.map((e) => [
        String(e.numero),
        formatDate(e.dateEcheance),
        formatMoney(e.montantPrevu),
        formatMoney(e.montantPaye),
        e.statut === 'payee'
          ? 'Payée'
          : e.statut === 'partielle'
            ? 'Partielle'
            : 'À venir',
      ]),
    );
  }
  paragraph(
    page,
    cursor,
    'Facture établie par MTM Immobilier. Les montants sont exprimés en francs CFA, toutes taxes comprises. Tout règlement doit mentionner la référence du dossier.',
    { size: 8.5, color: MUTED },
  );
}

function drawRecu(page: Page, data: VenteDocumentData, cursor: Cursor): void {
  const { prix, paye, reste } = totals(data);
  const last = [...data.paiements]
    .filter((p) => p.statut === 'valide')
    .sort((a, b) => b.datePaiement.getTime() - a.datePaiement.getTime())[0];
  sectionTitle(page, cursor, 'Reçu de paiement');
  if (!last) {
    paragraph(
      page,
      cursor,
      'Aucun paiement validé n’est enregistré sur ce dossier : le reçu sera disponible après validation du premier versement.',
      { color: MUTED },
    );
    return;
  }
  drawAmountHighlight(
    page,
    cursor,
    'Montant reçu',
    formatMoney(last.montant),
    SUCCESS,
  );
  paragraph(
    page,
    cursor,
    `MTM Immobilier reconnaît avoir reçu de ${data.client.nom} la somme de ${formatMoney(last.montant)} (${amountInWords(last.montant)}), par ${modeLabel(last.mode).toLowerCase()}${last.reference ? ` sous la référence ${last.reference}` : ''}, le ${formatDate(last.datePaiement)}, en règlement ${reste > 0 ? 'partiel' : 'intégral'} du terrain « ${data.terrain?.nom ?? '—'}${data.terrain?.referenceInterne ? ` (${data.terrain.referenceInterne})` : ''} » au prix de ${formatMoney(prix)}.`,
  );
  sectionTitle(page, cursor, 'Situation du dossier après ce versement');
  drawTable(
    page,
    cursor,
    [
      { label: 'Libellé', width: CONTENT_WIDTH - 150 },
      { label: 'Montant', width: 150, align: 'right' },
    ],
    [
      ['Prix de vente', formatMoney(prix)],
      ['Total payé à ce jour', formatMoney(paye)],
      ['Reste à payer', formatMoney(reste)],
    ],
    { totalRows: 1 },
  );
  drawSignatures(page, cursor, ['Pour MTM Immobilier', 'Le client']);
}

function drawBonReservation(
  page: Page,
  data: VenteDocumentData,
  cursor: Cursor,
): void {
  const { prix } = totals(data);
  const reservation = data.reservation;
  sectionTitle(page, cursor, 'Conditions de la réservation');
  if (!reservation) {
    paragraph(
      page,
      cursor,
      'Aucune réservation n’est enregistrée sur ce dossier : le bon sera disponible dès que le terrain aura été réservé.',
      { color: MUTED },
    );
    return;
  }
  drawTable(
    page,
    cursor,
    [
      { label: 'Libellé', width: CONTENT_WIDTH - 200 },
      { label: 'Valeur', width: 200, align: 'right' },
    ],
    [
      ['Référence de réservation', reservation.reference ?? data.reference],
      ['Prix de vente du terrain', formatMoney(prix)],
      ['Acompte de réservation', formatMoney(reservation.montantAcompte)],
      ['Date de réservation', formatDate(reservation.dateDebut)],
      ['Valable jusqu’au', formatDate(reservation.dateExpiration)],
      [
        'Solde restant après acompte',
        formatMoney(Math.max(0, prix - reservation.montantAcompte)),
      ],
    ],
    { totalRows: 1 },
  );
  paragraph(
    page,
    cursor,
    `Par le présent bon, MTM Immobilier réserve au profit de ${data.client.nom} le terrain « ${data.terrain?.nom ?? '—'}${data.terrain?.referenceInterne ? ` (${data.terrain.referenceInterne})` : ''} » jusqu’au ${formatDate(reservation.dateExpiration)}. Pendant cette période, le terrain est retiré de la commercialisation. À défaut de versement du solde ou de signature du contrat dans ce délai, la réservation devient caduque et le terrain est remis en vente ; le sort de l’acompte est régi par les conditions générales de MTM Immobilier.`,
  );
  drawSignatures(page, cursor, [
    'Pour MTM Immobilier',
    'Le client (lu et approuvé)',
  ]);
}

function drawContrat(
  page: Page,
  data: VenteDocumentData,
  cursor: Cursor,
): void {
  const { prix, paye, reste } = totals(data);
  sectionTitle(page, cursor, 'Article 1 — Objet');
  paragraph(
    page,
    cursor,
    `MTM Immobilier, ci-après « le vendeur », cède à ${data.client.nom}, ci-après « l’acquéreur », qui accepte, le terrain « ${data.terrain?.nom ?? '—'} »${data.terrain?.referenceInterne ? ` (réf. ${data.terrain.referenceInterne})` : ''}${data.terrain?.commune ? ` situé à ${[data.terrain.commune, data.terrain.region].filter(Boolean).join(', ')}` : ''}${data.terrain?.superficie ? `, d’une superficie de ${Math.round(data.terrain.superficie)} ${data.terrain.uniteSuperficie ?? 'm²'}` : ''}.`,
  );
  sectionTitle(page, cursor, 'Article 2 — Prix et modalités de paiement');
  paragraph(
    page,
    cursor,
    `La vente est consentie au prix de ${formatMoney(prix)} (${amountInWords(prix)}). À la date du présent contrat, l’acquéreur a versé ${formatMoney(paye)} ; le solde de ${formatMoney(reste)} est payable selon l’échéancier ci-dessous.`,
  );
  if (data.echeances.length > 0) {
    drawTable(
      page,
      cursor,
      [
        { label: 'N°', width: 40 },
        { label: 'Échéance', width: 160 },
        { label: 'Montant prévu', width: 150, align: 'right' },
        { label: 'Déjà payé', width: CONTENT_WIDTH - 350, align: 'right' },
      ],
      data.echeances.map((e) => [
        String(e.numero),
        formatDate(e.dateEcheance),
        formatMoney(e.montantPrevu),
        formatMoney(e.montantPaye),
      ]),
    );
  }
  sectionTitle(page, cursor, 'Article 3 — Transfert de propriété');
  paragraph(
    page,
    cursor,
    'Le transfert de propriété et la remise des documents définitifs interviennent au complet paiement du prix. Les frais d’enregistrement et de mutation sont à la charge de l’acquéreur, sauf convention contraire écrite.',
  );
  drawSignatures(page, cursor, [
    'Le vendeur — MTM Immobilier',
    'L’acquéreur (lu et approuvé)',
  ]);
}

function drawEtatPaiement(
  page: Page,
  data: VenteDocumentData,
  cursor: Cursor,
): void {
  const { prix, paye, reste } = totals(data);
  sectionTitle(page, cursor, 'Paiements enregistrés');
  const rows = [...data.paiements]
    .sort((a, b) => a.datePaiement.getTime() - b.datePaiement.getTime())
    .map((p) => [
      formatDate(p.datePaiement),
      modeLabel(p.mode),
      p.reference ?? '—',
      p.statut === 'valide' ? 'Validé' : 'En attente',
      formatMoney(p.montant),
    ]);
  if (rows.length === 0)
    rows.push(['—', 'Aucun paiement enregistré', '', '', '']);
  rows.push(['', '', '', 'Total validé', formatMoney(paye)]);
  drawTable(
    page,
    cursor,
    [
      { label: 'Date', width: 110 },
      { label: 'Mode', width: 120 },
      { label: 'Référence', width: 110 },
      { label: 'Statut', width: CONTENT_WIDTH - 460 },
      { label: 'Montant', width: 120, align: 'right' },
    ],
    rows,
    { totalRows: 1 },
  );
  drawTable(
    page,
    cursor,
    [
      { label: 'Synthèse', width: CONTENT_WIDTH - 150 },
      { label: 'Montant', width: 150, align: 'right' },
    ],
    [
      ['Prix de vente', formatMoney(prix)],
      ['Total payé', formatMoney(paye)],
      ['Reste à payer', formatMoney(reste)],
    ],
    { totalRows: 1 },
  );
  if (data.echeances.length > 0) {
    sectionTitle(page, cursor, 'Échéancier');
    drawTable(
      page,
      cursor,
      [
        { label: 'N°', width: 40 },
        { label: 'Échéance', width: 150 },
        { label: 'Prévu', width: 120, align: 'right' },
        { label: 'Payé', width: 120, align: 'right' },
        { label: 'Statut', width: CONTENT_WIDTH - 430 },
      ],
      data.echeances.map((e) => [
        String(e.numero),
        formatDate(e.dateEcheance),
        formatMoney(e.montantPrevu),
        formatMoney(e.montantPaye),
        e.statut === 'payee'
          ? 'Payée'
          : e.statut === 'partielle'
            ? 'Partielle'
            : 'À venir',
      ]),
    );
  }
}

function drawAmountHighlight(
  page: Page,
  cursor: Cursor,
  label: string,
  amount: string,
  color: string,
): void {
  const height = 52;
  page.rect(MARGIN, cursor.y, CONTENT_WIDTH, height, NAVY_SUBTLE);
  page.rect(MARGIN, cursor.y, 4, height, color);
  page.text(label.toUpperCase(), MARGIN + 18, cursor.y + 20, {
    font: 'bold',
    size: 8.5,
    color: MUTED,
  });
  page.text(amount, MARGIN + 18, cursor.y + 40, {
    font: 'bold',
    size: 16,
    color,
  });
  cursor.y += height + 18;
}

function drawSignatures(
  page: Page,
  cursor: Cursor,
  labels: [string, string],
): void {
  const top = Math.max(cursor.y + 10, A4.height - 210);
  const width = (CONTENT_WIDTH - 24) / 2;
  labels.forEach((label, index) => {
    const x = MARGIN + index * (width + 24);
    page.stroke(x, top, width, 90, BORDER);
    page.text(label, x + 12, top + 18, { font: 'bold', size: 9, color: NAVY });
    page.text('Date et signature', x + 12, top + 32, { size: 8, color: MUTED });
  });
  cursor.y = top + 100;
}

function drawFooter(page: Page, data: VenteDocumentData): void {
  const y = A4.height - 48;
  page.line(MARGIN, y - 14, MARGIN + CONTENT_WIDTH, y - 14, BORDER);
  page.text(
    `${data.company.name} · ${data.company.adresse} · ${data.company.telephone} · ${data.company.email}`,
    A4.width / 2,
    y,
    { size: 8, color: MUTED, align: 'center' },
  );
  page.text(
    `${data.title} ${data.reference} — document généré le ${formatDate(data.issuedAt)}`,
    A4.width / 2,
    y + 12,
    { size: 7.5, color: MUTED, align: 'center' },
  );
  page.rect(0, A4.height - 6, A4.width, 6, NAVY_DARK);
}
