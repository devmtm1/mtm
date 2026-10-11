import { A4, PdfDocument } from '../../common/pdf/pdf-document';
import { formatDate, formatMoney } from '../ventes/vente-document-renderer';
import {
  BORDER,
  CONTENT_WIDTH,
  MARGIN,
  MUTED,
  NAVY,
  NAVY_DARK,
  SUCCESS,
  TEXT,
  WARNING,
  drawEntete,
  drawPied,
  drawTable,
  paragraphe,
  sectionTitle,
  type Cursor,
  type Page,
  type Societe,
} from './mission-pdf-kit';
import type { SyntheseReglement } from './mission-paiements';

/** Ce dont la facture d'une mission a besoin : le client, le prix et les règlements. */
export interface MissionFactureData {
  /** Numéro de la facture, ex. MTM-FAC-VF-001/2026. */
  reference: string;
  dateFacture: Date;
  /** Référence du dossier, ex. MTM-VF-001/2026. */
  referenceDossier: string;
  company: Societe;
  client: {
    nom: string;
    dateNaissance: Date | null;
    lieuNaissance: string | null;
    telephone: string | null;
    email: string | null;
  };
  /** Nature de la prestation, ex. « Vérification foncière — Bambilor ». */
  objet: string;
  /** Texte de la ligne de facturation. */
  designation: string;
  paiements: Array<{
    datePaiement: Date;
    montantEnvoye: number;
    frais: number;
    montantNet: number;
    mode: string;
    reference: string | null;
  }>;
  synthese: SyntheseReglement;
  responsable: string | null;
}

const MODES: Record<string, string> = {
  especes: 'Espèces',
  virement: 'Virement',
  mobile_money: 'Mobile money',
  cheque: 'Chèque',
  autre: 'Autre',
};

const modeLibelle = (mode: string): string =>
  MODES[mode] ?? mode.replace(/_/g, ' ');

/** 02/10/2026 à 17:08, à l'heure de Dakar (UTC). */
function formatDateHeure(date: Date): string {
  const jour = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Dakar',
  });
  const heure = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Dakar',
  });
  return `${jour} à ${heure}`;
}

function formatJour(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Dakar',
  });
}

function statutFacture(synthese: SyntheseReglement): string {
  switch (synthese.statut) {
    case 'partiel':
      return `PARTIELLEMENT RÉGLÉE — SOLDE ${formatMoney(synthese.solde)}`;
    case 'solde':
      return 'SOLDÉE';
    case 'trop_percu':
      return `RÉGLÉE — TROP-PERÇU ${formatMoney(synthese.excedent)}`;
    default:
      return 'NON RÉGLÉE';
  }
}

/**
 * Facture d'une mission : le prix convenu, les règlements reçus (avec les
 * frais de transfert, distingués du prix) et ce qu'il reste à payer. Régénérée
 * après chaque règlement, elle garde son numéro et reflète la situation du jour.
 */
export function renderMissionFacture(data: MissionFactureData): Buffer {
  const pdf = new PdfDocument(`Facture ${data.reference}`);
  const pied = `Facture ${data.reference} — dossier ${data.referenceDossier} — établie le ${formatDate(data.dateFacture)}`;
  let page = pdf.addPage();
  const cursor: Cursor = { y: 126 };

  const ouvrirPage = (): Page => {
    drawPied(page, data.company, pied);
    const suivante = pdf.addPage();
    drawEntete(suivante, data.company);
    cursor.y = 120;
    return suivante;
  };
  const assurerPlace = (hauteur: number): void => {
    if (cursor.y + hauteur >= A4.height - 90) page = ouvrirPage();
  };

  drawEntete(page, data.company);

  page.text('FACTURE', MARGIN, cursor.y, {
    font: 'bold',
    size: 18,
    color: NAVY_DARK,
  });
  page.text(`n° ${data.reference}`, MARGIN, cursor.y + 18, {
    size: 10,
    color: MUTED,
  });
  page.text(
    `Date : ${formatDate(data.dateFacture)}`,
    A4.width - MARGIN,
    cursor.y,
    { size: 9.5, color: MUTED, align: 'right' },
  );
  cursor.y += 40;

  const couleurStatut =
    data.synthese.statut === 'partiel'
      ? WARNING
      : data.synthese.statut === 'non_regle'
        ? '#B52C36'
        : SUCCESS;
  page.rect(MARGIN, cursor.y, CONTENT_WIDTH, 36, '#EAF1F7');
  page.rect(MARGIN, cursor.y, 5, 36, couleurStatut);
  page.text('STATUT', MARGIN + 16, cursor.y + 14, {
    font: 'bold',
    size: 8,
    color: MUTED,
  });
  page.text(statutFacture(data.synthese), MARGIN + 16, cursor.y + 29, {
    font: 'bold',
    size: 11,
    color: couleurStatut,
  });
  cursor.y += 56;

  sectionTitle(page, cursor, 'Dossier et client');
  const naissance = [
    data.client.dateNaissance ? formatDate(data.client.dateNaissance) : null,
    data.client.lieuNaissance ? `à ${data.client.lieuNaissance}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const lignesClient: string[][] = [
    ['Référence du dossier', data.referenceDossier],
    ['Client', data.client.nom],
    ...(naissance ? [['Né(e) le', naissance]] : []),
    ...(data.client.telephone ? [['Téléphone', data.client.telephone]] : []),
    ...(data.client.email ? [['E-mail', data.client.email]] : []),
    ['Objet', data.objet],
  ];
  drawTable(
    page,
    cursor,
    [
      { label: 'Élément', width: 150 },
      { label: 'Information', width: CONTENT_WIDTH - 150 },
    ],
    lignesClient,
  );

  assurerPlace(120);
  sectionTitle(page, cursor, 'Détail de la prestation');
  const convenu = data.synthese.montantConvenu ?? 0;
  drawTable(
    page,
    cursor,
    [
      { label: 'Désignation', width: CONTENT_WIDTH - 250 },
      { label: 'Qté', width: 40, align: 'right' },
      { label: 'Prix unitaire', width: 105, align: 'right' },
      { label: 'Montant', width: 105, align: 'right' },
    ],
    [[data.designation, '1', formatMoney(convenu), formatMoney(convenu)]],
  );

  if (data.paiements.length) {
    assurerPlace(60 + data.paiements.length * 22 + 44);
    sectionTitle(page, cursor, 'Règlements reçus');
    drawTable(
      page,
      cursor,
      [
        { label: 'Date', width: 150 },
        { label: 'Mode', width: 95 },
        { label: 'Montant envoyé', width: 95, align: 'right' },
        { label: 'Frais', width: 75, align: 'right' },
        { label: 'Net reçu', width: CONTENT_WIDTH - 415, align: 'right' },
      ],
      [
        ...data.paiements.map((paiement) => [
          formatDateHeure(paiement.datePaiement),
          modeLibelle(paiement.mode),
          formatMoney(paiement.montantEnvoye),
          formatMoney(paiement.frais),
          formatMoney(paiement.montantNet),
        ]),
        [
          'TOTAL',
          '',
          formatMoney(data.synthese.totalEnvoye),
          formatMoney(data.synthese.totalFrais),
          formatMoney(data.synthese.totalNet),
        ],
      ],
      { totalRows: 1 },
    );
  }

  assurerPlace(150);
  sectionTitle(page, cursor, 'Situation de la facture');
  drawTable(
    page,
    cursor,
    [
      { label: 'Désignation', width: CONTENT_WIDTH - 150 },
      { label: 'Montant', width: 150, align: 'right' },
    ],
    [
      ['Montant total de la prestation', formatMoney(convenu)],
      [
        'Montant total envoyé par le client',
        formatMoney(data.synthese.totalEnvoye),
      ],
      ...(data.synthese.totalFrais > 0
        ? [
            [
              'Frais de transfert supportés',
              formatMoney(data.synthese.totalFrais),
            ],
          ]
        : []),
      [
        data.synthese.excedent > 0
          ? 'Trop-perçu à restituer ou à imputer'
          : 'Solde restant sur la prestation',
        formatMoney(
          data.synthese.excedent > 0
            ? data.synthese.excedent
            : (data.synthese.solde ?? convenu),
        ),
      ],
    ],
    { totalRows: 1 },
  );

  const transactions = data.paiements.filter((paiement) => paiement.reference);
  if (transactions.length) {
    assurerPlace(50 + transactions.length * 28);
    sectionTitle(page, cursor, 'Références des transactions');
    transactions.forEach((paiement, index) => {
      assurerPlace(30);
      paragraphe(
        page,
        cursor,
        `${index + 1}. Transaction du ${formatJour(paiement.datePaiement)} : ${paiement.reference} — montant envoyé ${formatMoney(paiement.montantEnvoye)}${paiement.frais > 0 ? ` — frais ${formatMoney(paiement.frais)} — net reçu ${formatMoney(paiement.montantNet)}` : ''}.`,
        { size: 9 },
      );
    });
  }

  if (data.synthese.totalFrais > 0) {
    assurerPlace(70);
    sectionTitle(page, cursor, 'Observation');
    paragraphe(
      page,
      cursor,
      `Les frais de transfert sont distincts du montant de la prestation. Le montant total envoyé par le client à ce jour est de ${formatMoney(data.synthese.totalEnvoye)}${
        data.synthese.solde
          ? ` ; le solde commercial de la prestation reste de ${formatMoney(data.synthese.solde)}`
          : ''
      }.`,
      { size: 9 },
    );
  }

  assurerPlace(110);
  sectionTitle(page, cursor, 'Validation');
  const colonne = CONTENT_WIDTH / 2 - 10;
  const droite = MARGIN + colonne + 20;
  page.text('Pour MTM Immobilier', MARGIN, cursor.y + 4, {
    font: 'bold',
    size: 9.5,
    color: NAVY,
  });
  page.text(
    data.responsable ?? 'Nom / qualité : ________________',
    MARGIN,
    cursor.y + 20,
    {
      size: 9,
      color: TEXT,
    },
  );
  page.text('Date : ____/____/______', MARGIN, cursor.y + 36, {
    size: 9,
    color: MUTED,
  });
  page.text('Signature / cachet :', MARGIN, cursor.y + 52, {
    size: 9,
    color: MUTED,
  });
  page.line(MARGIN, cursor.y + 84, MARGIN + colonne, cursor.y + 84, BORDER);

  page.text('Pour le client', droite, cursor.y + 4, {
    font: 'bold',
    size: 9.5,
    color: NAVY,
  });
  page.text(`Nom : ${data.client.nom}`, droite, cursor.y + 20, {
    size: 9,
    color: TEXT,
  });
  page.text('Date : ____/____/______', droite, cursor.y + 36, {
    size: 9,
    color: MUTED,
  });
  page.text('Signature :', droite, cursor.y + 52, { size: 9, color: MUTED });
  page.line(droite, cursor.y + 84, droite + colonne, cursor.y + 84, BORDER);

  drawPied(page, data.company, pied);
  return pdf.build();
}
