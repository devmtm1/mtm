import { A4, PdfDocument, type PdfFont } from '../../common/pdf/pdf-document';
import { formatDate, formatMoney } from '../ventes/vente-document-renderer';

/** Données nécessaires au rapport de vérification remis au client. */
export interface MissionReportData {
  reference: string;
  issuedAt: Date;
  company: {
    name: string;
    tagline: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  mission: {
    typeVerification: string;
    objectif: string | null;
    localisation: string | null;
    region: string | null;
    commune: string | null;
    latitude: number | null;
    longitude: number | null;
    piecesFournies: string | null;
    dateDemande: Date;
    decision: string | null;
    conclusion: string | null;
    reserves: string | null;
    recommandation: string | null;
    montantDevis: number | null;
    fraisEtude: number | null;
    montantPaye: number | null;
    faisabiliteConclusion: string | null;
    faisabiliteNotes: string | null;
  };
  client: { nom: string; email: string | null; telephone: string | null };
  terrain: {
    nom: string;
    referenceInterne: string | null;
    commune: string | null;
    region: string | null;
    superficie: number | null;
    statutJuridique: string | null;
  } | null;
  responsable: string | null;
  etapes: Array<{
    type: string;
    titre: string;
    observations: string | null;
    dateVisite: Date | null;
    latitude: number | null;
    longitude: number | null;
    accesDescription: string | null;
    environnement: string | null;
    conformiteApparente: string | null;
    administration: string | null;
    interlocuteur: string | null;
    resultat: string | null;
    realiseePar: string | null;
    realiseeLe: Date;
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
const WARNING = '#B7791F';

const MARGIN = 48;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

type Page = ReturnType<PdfDocument['addPage']>;
interface Cursor {
  y: number;
}

const LIBELLES: Record<string, string> = {
  verification_fonciere: 'Vérification foncière',
  verification_physique: 'Vérification physique',
  verification_administrative: 'Vérification administrative',
  accompagnement_achat: 'Accompagnement à l’achat',
  favorable: 'Favorable',
  defavorable: 'Défavorable',
  a_completer: 'À compléter',
  conforme: 'Conforme aux informations fournies',
  ecart_mineur: 'Écart mineur constaté',
  ecart_majeur: 'Écart majeur constaté',
  non_verifiable: 'Non vérifiable sur place',
  mairie: 'Mairie',
  service_domaines: 'Service des Domaines',
  cadastre: 'Cadastre',
  conservation_fonciere: 'Conservation foncière',
  prefecture: 'Préfecture',
  sous_prefecture: 'Sous-préfecture',
  confirme: 'Information confirmée',
  infirme: 'Information infirmée',
  partiel: 'Confirmation partielle',
  sans_reponse: 'Sans réponse',
  en_attente: 'Réponse en attente',
  faisabilite: 'Étude de faisabilité',
  rapport: 'Rapport',
  autre: 'Autre',
};

function libelle(valeur: string | null | undefined): string {
  if (!valeur) return '—';
  return LIBELLES[valeur] ?? valeur.replace(/_/g, ' ');
}

/**
 * Rapport de vérification foncière (étape 5 du cahier des charges).
 *
 * Il répond à une seule question — MTM recommande-t-il d'acheter ? — et
 * doit pouvoir être lu seul, à distance, par un client qui n'était pas sur
 * place : d'où la décision en évidence, puis les constats datés et signés
 * qui la justifient.
 */
export function renderMissionReport(data: MissionReportData): Buffer {
  const pdf = new PdfDocument(`Rapport de vérification ${data.reference}`);
  let page = pdf.addPage();
  const cursor: Cursor = { y: 0 };

  drawHeader(page, data);
  drawTitre(page, data, cursor);
  drawDecision(page, data, cursor);
  drawParties(page, data, cursor);
  drawObjet(page, data, cursor);

  const physiques = data.etapes.filter(
    (etape) => etape.type === 'verification_physique',
  );
  const administratives = data.etapes.filter(
    (etape) => etape.type === 'verification_administrative',
  );

  if (data.mission.faisabiliteConclusion || data.mission.faisabiliteNotes) {
    page = assurerPlace(pdf, page, cursor, 90, data);
    sectionTitle(page, cursor, 'Étude de faisabilité');
    paragraphe(
      page,
      cursor,
      `Conclusion : ${libelle(data.mission.faisabiliteConclusion)}.${
        data.mission.faisabiliteNotes ? ` ${data.mission.faisabiliteNotes}` : ''
      }`,
    );
  }

  if (physiques.length) {
    page = assurerPlace(pdf, page, cursor, 120, data);
    sectionTitle(page, cursor, 'Vérification physique');
    for (const etape of physiques) {
      page = assurerPlace(pdf, page, cursor, 110, data);
      drawConstatPhysique(page, cursor, etape);
    }
  }

  if (administratives.length) {
    page = assurerPlace(pdf, page, cursor, 120, data);
    sectionTitle(page, cursor, 'Vérification administrative');
    page = assurerPlace(
      pdf,
      page,
      cursor,
      40 + administratives.length * 22,
      data,
    );
    drawTable(
      page,
      cursor,
      [
        { label: 'Administration', width: 150 },
        { label: 'Interlocuteur', width: 130 },
        { label: 'Date', width: 90 },
        { label: 'Résultat', width: CONTENT_WIDTH - 370 },
      ],
      administratives.map((etape) => [
        libelle(etape.administration),
        etape.interlocuteur ?? '—',
        formatDate(etape.realiseeLe),
        libelle(etape.resultat),
      ]),
    );
    for (const etape of administratives.filter((e) => e.observations)) {
      page = assurerPlace(pdf, page, cursor, 60, data);
      paragraphe(
        page,
        cursor,
        `${libelle(etape.administration)} — ${etape.observations ?? ''}`,
        { size: 9 },
      );
    }
  }

  page = assurerPlace(pdf, page, cursor, 150, data);
  drawConclusion(page, data, cursor);

  if (
    data.mission.montantDevis !== null ||
    data.mission.fraisEtude !== null ||
    data.mission.montantPaye !== null
  ) {
    page = assurerPlace(pdf, page, cursor, 110, data);
    sectionTitle(page, cursor, 'Facturation de la mission');
    drawTable(
      page,
      cursor,
      [
        { label: 'Désignation', width: CONTENT_WIDTH - 150 },
        { label: 'Montant', width: 150, align: 'right' },
      ],
      [
        [
          'Montant convenu pour la mission',
          formatMoney(data.mission.montantDevis),
        ],
        ...(data.mission.fraisEtude !== null
          ? [
              [
                'dont frais d’étude préalable',
                formatMoney(data.mission.fraisEtude),
              ],
            ]
          : []),
        ['Montant réglé', formatMoney(data.mission.montantPaye)],
      ],
      { totalRows: 1 },
    );
  }

  page = assurerPlace(pdf, page, cursor, 90, data);
  drawSignature(page, data, cursor);
  drawFooter(page, data);
  return pdf.build();
}

/** Ouvre une page quand la suivante ne tient plus, en gardant l'habillage. */
function assurerPlace(
  pdf: PdfDocument,
  page: Page,
  cursor: Cursor,
  hauteur: number,
  data: MissionReportData,
): Page {
  if (cursor.y + hauteur < A4.height - 90) return page;
  drawFooter(page, data);
  const suivante = pdf.addPage();
  drawHeader(suivante, data);
  cursor.y = 120;
  return suivante;
}

function drawHeader(page: Page, data: MissionReportData): void {
  page.rect(0, 0, A4.width, 92, NAVY);
  page.rect(0, 92, A4.width, 4, ACCENT);
  page.text(data.company.name.toUpperCase(), MARGIN, 44, {
    font: 'bold',
    size: 20,
    color: '#FFFFFF',
  });
  page.text(data.company.tagline, MARGIN, 62, { size: 9, color: '#CFE0EE' });
  const droite = A4.width - MARGIN;
  page.text(data.company.adresse, droite, 40, {
    size: 9,
    color: '#FFFFFF',
    align: 'right',
  });
  page.text(data.company.telephone, droite, 54, {
    size: 9,
    color: '#FFFFFF',
    align: 'right',
  });
  page.text(data.company.email, droite, 68, {
    size: 9,
    color: '#FFFFFF',
    align: 'right',
  });
}

function drawTitre(page: Page, data: MissionReportData, cursor: Cursor): void {
  cursor.y = 126;
  page.text('RAPPORT DE VÉRIFICATION FONCIÈRE', MARGIN, cursor.y, {
    font: 'bold',
    size: 16,
    color: NAVY_DARK,
  });
  page.text(
    `${data.reference} · ${libelle(data.mission.typeVerification)}`,
    MARGIN,
    cursor.y + 18,
    { size: 9.5, color: MUTED },
  );
  page.text(
    `Établi le ${formatDate(data.issuedAt)}`,
    A4.width - MARGIN,
    cursor.y,
    {
      size: 9.5,
      color: MUTED,
      align: 'right',
    },
  );
  cursor.y += 40;
}

/** La décision de MTM, en évidence : c'est ce que le client cherche d'abord. */
function drawDecision(
  page: Page,
  data: MissionReportData,
  cursor: Cursor,
): void {
  const decision = data.mission.decision;
  const couleur =
    decision === 'favorable'
      ? SUCCESS
      : decision === 'defavorable'
        ? ACCENT
        : WARNING;
  page.rect(MARGIN, cursor.y, CONTENT_WIDTH, 54, NAVY_SUBTLE);
  page.rect(MARGIN, cursor.y, 5, 54, couleur);
  page.text('DÉCISION DE MTM IMMOBILIER', MARGIN + 18, cursor.y + 20, {
    size: 8.5,
    color: MUTED,
    font: 'bold',
  });
  page.text(libelle(decision).toUpperCase(), MARGIN + 18, cursor.y + 40, {
    size: 15,
    color: couleur,
    font: 'bold',
  });
  cursor.y += 74;
}

function drawParties(
  page: Page,
  data: MissionReportData,
  cursor: Cursor,
): void {
  const colonne = CONTENT_WIDTH / 2 - 10;
  const depart = cursor.y;
  page.text('CLIENT DEMANDEUR', MARGIN, depart, {
    font: 'bold',
    size: 8.5,
    color: MUTED,
  });
  page.text(data.client.nom, MARGIN, depart + 16, { font: 'bold', size: 11 });
  const contact = [data.client.telephone, data.client.email]
    .filter(Boolean)
    .join(' · ');
  if (contact) {
    page.text(contact, MARGIN, depart + 30, { size: 9, color: MUTED });
  }

  const droite = MARGIN + colonne + 20;
  page.text('MISSION CONFIÉE LE', droite, depart, {
    font: 'bold',
    size: 8.5,
    color: MUTED,
  });
  page.text(formatDate(data.mission.dateDemande), droite, depart + 16, {
    font: 'bold',
    size: 11,
  });
  if (data.responsable) {
    page.text(
      `Vérifications menées par ${data.responsable}`,
      droite,
      depart + 30,
      {
        size: 9,
        color: MUTED,
        width: colonne,
      },
    );
  }
  cursor.y = depart + 54;
}

function drawObjet(page: Page, data: MissionReportData, cursor: Cursor): void {
  sectionTitle(page, cursor, 'Objet de la vérification');
  const lignes: string[][] = [];
  if (data.terrain) {
    lignes.push([
      'Terrain',
      `${data.terrain.nom}${data.terrain.referenceInterne ? ` (${data.terrain.referenceInterne})` : ''}`,
    ]);
    if (data.terrain.superficie !== null) {
      lignes.push(['Superficie annoncée', `${data.terrain.superficie} m²`]);
    }
    if (data.terrain.statutJuridique) {
      lignes.push(['Statut juridique annoncé', data.terrain.statutJuridique]);
    }
  }
  const lieu = [
    data.mission.localisation,
    data.mission.commune,
    data.mission.region,
  ]
    .filter(Boolean)
    .join(', ');
  if (lieu) lignes.push(['Localisation', lieu]);
  if (data.mission.latitude !== null && data.mission.longitude !== null) {
    lignes.push([
      'Coordonnées GPS',
      `${data.mission.latitude}, ${data.mission.longitude}`,
    ]);
  }
  if (data.mission.objectif)
    lignes.push(['Objectif du client', data.mission.objectif]);
  if (data.mission.piecesFournies) {
    lignes.push(['Pièces fournies', data.mission.piecesFournies]);
  }

  drawTable(
    page,
    cursor,
    [
      { label: 'Élément', width: 170 },
      { label: 'Information', width: CONTENT_WIDTH - 170 },
    ],
    lignes.length ? lignes : [['—', 'Aucune information fournie']],
  );
}

function drawConstatPhysique(
  page: Page,
  cursor: Cursor,
  etape: MissionReportData['etapes'][number],
): void {
  page.text(etape.titre, MARGIN, cursor.y + 10, {
    font: 'bold',
    size: 10,
    color: NAVY_DARK,
  });
  const meta = [
    etape.dateVisite ? `Visite du ${formatDate(etape.dateVisite)}` : null,
    etape.realiseePar ? `par ${etape.realiseePar}` : null,
    etape.latitude !== null && etape.longitude !== null
      ? `GPS ${etape.latitude}, ${etape.longitude}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  page.text(meta, MARGIN, cursor.y + 24, { size: 8.5, color: MUTED });
  cursor.y += 32;

  if (etape.conformiteApparente) {
    paragraphe(
      page,
      cursor,
      `Conformité apparente : ${libelle(etape.conformiteApparente)}`,
      { font: 'bold', size: 9.5 },
    );
  }
  if (etape.accesDescription) {
    paragraphe(page, cursor, `Accès : ${etape.accesDescription}`, { size: 9 });
  }
  if (etape.environnement) {
    paragraphe(page, cursor, `Environnement : ${etape.environnement}`, {
      size: 9,
    });
  }
  if (etape.observations) {
    paragraphe(page, cursor, etape.observations, { size: 9 });
  }
  page.line(MARGIN, cursor.y, MARGIN + CONTENT_WIDTH, cursor.y, BORDER);
  cursor.y += 14;
}

function drawConclusion(
  page: Page,
  data: MissionReportData,
  cursor: Cursor,
): void {
  sectionTitle(page, cursor, 'Conclusion et recommandation');
  paragraphe(
    page,
    cursor,
    data.mission.conclusion ??
      'La conclusion de cette mission n’a pas encore été rédigée.',
  );
  if (data.mission.reserves) {
    paragraphe(page, cursor, `Réserves : ${data.mission.reserves}`, {
      color: WARNING,
    });
  }
  if (data.mission.recommandation) {
    paragraphe(
      page,
      cursor,
      `Recommandation : ${data.mission.recommandation}`,
      { font: 'bold' },
    );
  }
}

function drawSignature(
  page: Page,
  data: MissionReportData,
  cursor: Cursor,
): void {
  page.text(
    'Ce rapport est établi à partir des constats effectués aux dates indiquées. Il engage MTM Immobilier sur la sincérité de ces constats, non sur l’évolution ultérieure de la situation du terrain.',
    MARGIN,
    cursor.y + 10,
    { size: 8, color: MUTED, width: CONTENT_WIDTH, lineHeight: 12 },
  );
  cursor.y += 44;
  page.text(
    data.responsable ?? data.company.name,
    A4.width - MARGIN,
    cursor.y,
    {
      font: 'bold',
      size: 10,
      align: 'right',
    },
  );
  page.text('Pour MTM Immobilier', A4.width - MARGIN, cursor.y + 14, {
    size: 8.5,
    color: MUTED,
    align: 'right',
  });
}

function sectionTitle(page: Page, cursor: Cursor, titre: string): void {
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

function paragraphe(
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

interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

function drawTable(
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
    if (estTotal)
      page.rect(MARGIN, y, CONTENT_WIDTH, hauteurLigne, NAVY_SUBTLE);
    else if (index % 2 === 1)
      page.rect(MARGIN, y, CONTENT_WIDTH, hauteurLigne, '#F7F8FA');
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
      });
      cellX += colonne.width;
    });
    y += hauteurLigne;
  });
  page.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y, BORDER);
  cursor.y = y + 18;
}

function drawFooter(page: Page, data: MissionReportData): void {
  const y = A4.height - 48;
  page.line(MARGIN, y - 14, MARGIN + CONTENT_WIDTH, y - 14, BORDER);
  page.text(
    `${data.company.name} · ${data.company.adresse} · ${data.company.telephone} · ${data.company.email}`,
    A4.width / 2,
    y,
    { size: 8, color: MUTED, align: 'center' },
  );
  page.text(
    `Rapport de vérification ${data.reference} — généré le ${formatDate(data.issuedAt)}`,
    A4.width / 2,
    y + 12,
    { size: 7.5, color: MUTED, align: 'center' },
  );
  page.rect(0, A4.height - 6, A4.width, 6, NAVY_DARK);
}
