import { A4, PdfDocument, type PdfJpeg } from '../../common/pdf/pdf-document';
import type { SyntheseReglement } from './mission-paiements';
import {
  ACCENT,
  BORDER,
  CONTENT_WIDTH,
  MARGIN,
  MUTED,
  NAVY_DARK,
  NAVY_SUBTLE,
  SUCCESS,
  WARNING,
  drawEntete,
  drawPied,
  drawTable,
  paragraphe,
  sectionTitle,
  type Cursor,
  type Page,
} from './mission-pdf-kit';
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
  client: {
    nom: string;
    email: string | null;
    telephone: string | null;
    dateNaissance: Date | null;
    lieuNaissance: string | null;
    /** « Carte d'identité CEDEAO n° … » : sans le numéro tant qu'il n'est pas saisi. */
    pieceIdentite: string | null;
  };
  /** Règlements reçus et situation du solde ; `null` tant qu'aucun prix n'est fixé. */
  reglement: {
    synthese: SyntheseReglement;
    paiements: Array<{
      datePaiement: Date;
      montantEnvoye: number;
      frais: number;
    }>;
  } | null;
  /** Photos de la visite, déjà converties en JPEG : l'annexe du rapport. */
  photos: Array<{ titre: string | null; jpeg: PdfJpeg }>;
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
    personnesPresentes: string | null;
    administration: string | null;
    interlocuteur: string | null;
    resultat: string | null;
    realiseePar: string | null;
    realiseeLe: Date;
  }>;
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
    data.reglement
  ) {
    page = assurerPlace(pdf, page, cursor, 130, data);
    sectionTitle(page, cursor, 'Facturation de la mission');
    const synthese = data.reglement?.synthese;
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
        ['Montant réglé', formatMoney(synthese?.totalEnvoye ?? 0)],
        ...(synthese && synthese.solde
          ? [['Solde restant à régler', formatMoney(synthese.solde)]]
          : []),
      ],
      { totalRows: 1 },
    );
  }

  page = assurerPlace(pdf, page, cursor, 90, data);
  drawSignature(page, data, cursor);
  drawFooter(page, data);
  if (data.photos.length) drawAnnexePhotos(pdf, data);
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
  drawEntete(page, data.company);
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
  const identite = [
    data.client.dateNaissance
      ? `Né(e) le ${formatDate(data.client.dateNaissance)}${data.client.lieuNaissance ? ` à ${data.client.lieuNaissance}` : ''}`
      : null,
    data.client.pieceIdentite,
  ]
    .filter(Boolean)
    .join(' · ');
  if (identite) {
    page.text(identite, MARGIN, depart + 43, {
      size: 9,
      color: MUTED,
      width: colonne,
    });
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
  cursor.y = depart + (identite ? 68 : 54);
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
  if (etape.personnesPresentes) {
    paragraphe(
      page,
      cursor,
      `Personnes présentes : ${etape.personnesPresentes}`,
      {
        size: 9,
      },
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

function drawFooter(page: Page, data: MissionReportData): void {
  drawPied(
    page,
    data.company,
    `Rapport de vérification ${data.reference} — généré le ${formatDate(data.issuedAt)}`,
  );
}

const PHOTOS_PAR_PAGE = 6;
const PHOTO_LARGEUR = (CONTENT_WIDTH - 16) / 2;
const PHOTO_HAUTEUR = 132;
const PHOTO_PAS = PHOTO_HAUTEUR + 40;

/**
 * Annexe photographique : deux photos par rangée, légendées et numérotées.
 * Elle illustre le constat sans le remplacer, ce que la note finale rappelle
 * au lecteur (une photo n'établit ni les limites ni la propriété du terrain).
 */
function drawAnnexePhotos(pdf: PdfDocument, data: MissionReportData): void {
  let page = pdf.addPage();
  const cursor: Cursor = { y: 120 };
  drawHeader(page, data);
  sectionTitle(page, cursor, 'Annexe — Reportage photographique du site');
  paragraphe(
    page,
    cursor,
    'Les photographies ci-dessous ont été prises lors de la visite physique du site. Elles sont annexées au présent rapport à titre de constat visuel de l’environnement et de l’état apparent du site au moment de la visite.',
    { size: 8.5, color: MUTED },
  );

  data.photos.forEach((photo, index) => {
    const rang = index % PHOTOS_PAR_PAGE;
    if (index > 0 && rang === 0) {
      drawFooter(page, data);
      page = pdf.addPage();
      drawHeader(page, data);
      cursor.y = 120;
    }
    const colonne = rang % 2;
    const ligne = Math.floor(rang / 2);
    const x = MARGIN + colonne * (PHOTO_LARGEUR + 16);
    const y = cursor.y + ligne * PHOTO_PAS;
    page.rect(x, y, PHOTO_LARGEUR, PHOTO_HAUTEUR, '#F3F4F6');
    page.image(photo.jpeg, x, y, PHOTO_LARGEUR, PHOTO_HAUTEUR);
    page.stroke(x, y, PHOTO_LARGEUR, PHOTO_HAUTEUR, BORDER);
    page.text(`Photo ${index + 1}`, x, y + PHOTO_HAUTEUR + 13, {
      font: 'bold',
      size: 8.5,
      color: NAVY_DARK,
    });
    if (photo.titre) {
      page.text(photo.titre, x, y + PHOTO_HAUTEUR + 25, {
        size: 8,
        color: MUTED,
        width: PHOTO_LARGEUR,
        lineHeight: 10,
      });
    }
  });

  const dernierRang = (data.photos.length - 1) % PHOTOS_PAR_PAGE;
  cursor.y += (Math.floor(dernierRang / 2) + 1) * PHOTO_PAS + 6;
  if (cursor.y + 50 > A4.height - 90) {
    drawFooter(page, data);
    page = pdf.addPage();
    drawHeader(page, data);
    cursor.y = 120;
  }
  paragraphe(
    page,
    cursor,
    'Nota : les photographies constituent des éléments d’illustration du constat physique. Elles ne permettent pas, à elles seules, d’établir les limites cadastrales, la propriété juridique ou la régularité administrative du terrain.',
    { size: 8, color: MUTED },
  );
  drawFooter(page, data);
}
