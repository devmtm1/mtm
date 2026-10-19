import { A4, PdfDocument } from '../../common/pdf/pdf-document';
import { formatMoney } from '../ventes/vente-document-renderer';
import {
  CONTENT_WIDTH,
  MARGIN,
  MUTED,
  NAVY_DARK,
  SUCCESS,
  WARNING,
  drawEntete,
  drawPied,
  drawTable,
  paragraphe,
  sectionTitle,
  type Cursor,
  type Page,
  type Societe,
  type TableColumn,
} from '../demarches/mission-pdf-kit';

/** Ce que le rapport quotidien fige : tout ce que la Direction lit chaque soir. */
export interface RapportQuotidienContenu {
  /** AAAA-MM-JJ */
  date: string;
  genereLe: string;
  /** Aucun mouvement d'argent ce jour-là : le rapport est quand même transmis. */
  aucuneOperation: boolean;
  caisses: Array<{
    compte: string;
    type: string;
    soldeInitial: number;
    encaissements: number;
    decaissements: number;
    soldeTheorique: number;
    cloture: boolean;
    montantCompte: number | null;
    ecart: number | null;
    explication: string | null;
    decision: string | null;
  }>;
  encaissementsParMode: Array<{
    mode: string;
    montant: number;
    nombre: number;
  }>;
  depenses: Array<{
    numero: string | null;
    libelle: string;
    tiers: string | null;
    montant: number;
    mode: string | null;
    autorisation: string;
    justifie: boolean;
  }>;
  ventes: Array<{
    libelle: string;
    tiers: string | null;
    montant: number;
    mode: string | null;
    reference: string | null;
  }>;
  reversements: {
    payes: Array<{
      libelle: string;
      tiers: string | null;
      montant: number;
      mode: string | null;
      reference: string | null;
    }>;
    soldeDu: number;
    aPayer: number;
    enAttenteAutorisation: number;
  };
  chantiers: {
    recettes: Array<{ libelle: string; tiers: string | null; montant: number }>;
    depenses: Array<{ libelle: string; tiers: string | null; montant: number }>;
  };
  creances: {
    loyers: number;
    ventes: number;
    missions: number;
    echeancesEnRetard: number;
  };
  justificatifsManquants: Array<{
    numero: string | null;
    libelle: string;
    montant: number;
  }>;
  enAttente: {
    operations: number;
    paiementsVente: number;
    mouvementsFonds: number;
    reversements: number;
    paiementsChantier: number;
  };
  anomalies: string[];
}

export interface RapportQuotidienPdf {
  statut: string;
  preparePar: string;
  verifiePar: string | null;
  contenu: RapportQuotidienContenu;
  company: Societe;
}

const LIBELLES_STATUT: Record<string, string> = {
  brouillon: 'BROUILLON',
  verifie: 'VÉRIFIÉ',
  transmis: 'TRANSMIS',
};

function jourFr(iso: string): string {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const modeLibelle = (mode: string | null): string =>
  mode ? mode.replace(/_/g, ' ') : '—';

/**
 * Rapport financier du jour, en PDF : modèle validé par la Direction. Il est
 * produit même sans opération, pour dire que rien n'a été enregistré et où en
 * est la clôture de caisse.
 */
export function renderRapportQuotidien(data: RapportQuotidienPdf): Buffer {
  const c = data.contenu;
  const pdf = new PdfDocument(`Rapport financier du ${c.date}`);
  const pied = `Rapport financier du ${c.date} — ${LIBELLES_STATUT[data.statut] ?? data.statut}`;
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

  /** Un tableau découpé par paquets de lignes, pour ne jamais sortir de la page. */
  const tableau = (
    titre: string,
    colonnes: TableColumn[],
    lignes: string[][],
    vide: string,
    options: { totalRows?: number } = {},
  ): void => {
    assurerPlace(70);
    sectionTitle(page, cursor, titre);
    if (lignes.length === 0) {
      paragraphe(page, cursor, vide, { color: MUTED });
      return;
    }
    const total = options.totalRows ?? 0;
    const corps = lignes.slice(0, lignes.length - total);
    const pied = lignes.slice(lignes.length - total);
    const paquet = 10;
    for (let i = 0; i < corps.length; i += paquet) {
      assurerPlace(60 + Math.min(paquet, corps.length - i) * 26);
      const dernier = i + paquet >= corps.length;
      drawTable(
        page,
        cursor,
        colonnes,
        dernier
          ? [...corps.slice(i, i + paquet), ...pied]
          : corps.slice(i, i + paquet),
        { totalRows: dernier ? total : 0 },
      );
    }
  };

  drawEntete(page, data.company);
  page.text('RAPPORT FINANCIER QUOTIDIEN', MARGIN, cursor.y, {
    font: 'bold',
    size: 18,
    color: NAVY_DARK,
  });
  page.text(jourFr(c.date), MARGIN, cursor.y + 18, { size: 10, color: MUTED });
  page.text(
    `Préparé par ${data.preparePar}${data.verifiePar ? ` — vérifié par ${data.verifiePar}` : ''}`,
    A4.width - MARGIN,
    cursor.y,
    { size: 9.5, color: MUTED, align: 'right' },
  );
  cursor.y += 40;

  const couleur = data.statut === 'transmis' ? SUCCESS : WARNING;
  page.rect(MARGIN, cursor.y, CONTENT_WIDTH, 36, '#EAF1F7');
  page.rect(MARGIN, cursor.y, 5, 36, couleur);
  page.text('STATUT', MARGIN + 16, cursor.y + 14, {
    font: 'bold',
    size: 8,
    color: MUTED,
  });
  page.text(
    LIBELLES_STATUT[data.statut] ?? data.statut.toUpperCase(),
    MARGIN + 16,
    cursor.y + 29,
    { font: 'bold', size: 11, color: couleur },
  );
  cursor.y += 56;

  if (c.aucuneOperation) {
    paragraphe(
      page,
      cursor,
      'Aucune opération n’a été enregistrée ce jour. Ce rapport est transmis pour le confirmer ; l’état des caisses figure ci-dessous.',
      { font: 'bold' },
    );
  }

  tableau(
    'Caisses et comptes — solde et clôture',
    [
      { label: 'Compte', width: 120 },
      { label: 'Solde initial', width: 80, align: 'right' },
      { label: 'Entrées', width: 70, align: 'right' },
      { label: 'Sorties', width: 70, align: 'right' },
      { label: 'Théorique', width: 80, align: 'right' },
      { label: 'Compté', width: CONTENT_WIDTH - 420, align: 'right' },
    ],
    c.caisses.map((x) => [
      x.compte,
      formatMoney(x.soldeInitial),
      formatMoney(x.encaissements),
      formatMoney(x.decaissements),
      formatMoney(x.soldeTheorique),
      x.cloture ? formatMoney(x.montantCompte) : 'non clôturée',
    ]),
    'Aucun compte de trésorerie n’est paramétré.',
  );
  const ecarts = c.caisses.filter((x) => x.cloture && x.ecart);
  if (ecarts.length > 0) {
    tableau(
      'Écarts de caisse et décisions',
      [
        { label: 'Compte', width: 110 },
        { label: 'Écart', width: 90, align: 'right' },
        { label: 'Explication', width: CONTENT_WIDTH - 300 },
        { label: 'Décision', width: 100 },
      ],
      ecarts.map((x) => [
        x.compte,
        formatMoney(x.ecart),
        x.explication ?? '—',
        (
          {
            en_attente: 'en attente',
            acceptee: 'acceptée',
            a_corriger: 'à corriger',
          } as Record<string, string>
        )[x.decision ?? ''] ?? '—',
      ]),
      '',
    );
  }

  tableau(
    'Encaissements du jour par moyen de paiement',
    [
      { label: 'Moyen de paiement', width: CONTENT_WIDTH - 220 },
      { label: 'Opérations', width: 90, align: 'right' },
      { label: 'Montant', width: 130, align: 'right' },
    ],
    [
      ...c.encaissementsParMode.map((e) => [
        modeLibelle(e.mode),
        String(e.nombre),
        formatMoney(e.montant),
      ]),
      ...(c.encaissementsParMode.length > 0
        ? [
            [
              'Total',
              String(c.encaissementsParMode.reduce((t, e) => t + e.nombre, 0)),
              formatMoney(
                c.encaissementsParMode.reduce((t, e) => t + e.montant, 0),
              ),
            ],
          ]
        : []),
    ],
    'Aucun encaissement ce jour.',
    { totalRows: c.encaissementsParMode.length > 0 ? 1 : 0 },
  );

  tableau(
    'Dépenses payées, autorisations et justificatifs',
    [
      { label: 'N°', width: 78 },
      { label: 'Libellé', width: CONTENT_WIDTH - 78 - 85 - 95 - 70 },
      { label: 'Montant', width: 85, align: 'right' },
      { label: 'Autorisation', width: 95 },
      { label: 'Pièce', width: 70 },
    ],
    c.depenses.map((d) => [
      d.numero ?? '—',
      d.tiers ? `${d.libelle} — ${d.tiers}` : d.libelle,
      formatMoney(d.montant),
      d.autorisation,
      d.justifie ? 'jointe' : 'MANQUANTE',
    ]),
    'Aucune dépense payée ce jour.',
  );

  tableau(
    'Ventes de terrains et paiements reçus',
    [
      { label: 'Libellé', width: CONTENT_WIDTH - 250 },
      { label: 'Mode', width: 80 },
      { label: 'Référence', width: 80 },
      { label: 'Montant', width: 90, align: 'right' },
    ],
    c.ventes.map((v) => [
      v.tiers ? `${v.libelle} — ${v.tiers}` : v.libelle,
      modeLibelle(v.mode),
      v.reference ?? '—',
      formatMoney(v.montant),
    ]),
    'Aucun paiement de vente reçu ce jour.',
  );

  tableau(
    'Reversements aux propriétaires',
    [
      { label: 'Libellé', width: CONTENT_WIDTH - 250 },
      { label: 'Mode', width: 80 },
      { label: 'Référence', width: 80 },
      { label: 'Montant', width: 90, align: 'right' },
    ],
    c.reversements.payes.map((r) => [
      r.tiers ? `${r.libelle} — ${r.tiers}` : r.libelle,
      modeLibelle(r.mode),
      r.reference ?? '—',
      formatMoney(r.montant),
    ]),
    'Aucun reversement payé ce jour.',
  );
  paragraphe(
    page,
    cursor,
    `Solde restant dû aux propriétaires : ${formatMoney(c.reversements.soldeDu)}. Reversements autorisés à payer : ${formatMoney(c.reversements.aPayer)}. En attente d’autorisation : ${c.reversements.enAttenteAutorisation}.`,
  );

  tableau(
    'Recettes et dépenses des chantiers',
    [
      { label: 'Nature', width: 80 },
      { label: 'Libellé', width: CONTENT_WIDTH - 80 - 100 },
      { label: 'Montant', width: 100, align: 'right' },
    ],
    [
      ...c.chantiers.recettes.map((r) => [
        'Recette',
        r.tiers ? `${r.libelle} — ${r.tiers}` : r.libelle,
        formatMoney(r.montant),
      ]),
      ...c.chantiers.depenses.map((d) => [
        'Dépense',
        d.tiers ? `${d.libelle} — ${d.tiers}` : d.libelle,
        formatMoney(d.montant),
      ]),
    ],
    'Aucun mouvement de chantier ce jour.',
  );

  tableau(
    'Créances et retards de paiement',
    [
      { label: 'Origine', width: CONTENT_WIDTH - 130 },
      { label: 'Reste dû', width: 130, align: 'right' },
    ],
    [
      ['Loyers impayés', formatMoney(c.creances.loyers)],
      ['Ventes en retard', formatMoney(c.creances.ventes)],
      ['Démarches à encaisser', formatMoney(c.creances.missions)],
      [
        'Total',
        formatMoney(
          c.creances.loyers + c.creances.ventes + c.creances.missions,
        ),
      ],
    ],
    '',
    { totalRows: 1 },
  );

  tableau(
    'Justificatifs manquants',
    [
      { label: 'N°', width: 90 },
      { label: 'Libellé', width: CONTENT_WIDTH - 90 - 100 },
      { label: 'Montant', width: 100, align: 'right' },
    ],
    c.justificatifsManquants.map((j) => [
      j.numero ?? '—',
      j.libelle,
      formatMoney(j.montant),
    ]),
    'Aucun justificatif manquant.',
  );

  tableau(
    'Opérations en attente de validation',
    [
      { label: 'File d’attente', width: CONTENT_WIDTH - 90 },
      { label: 'Nombre', width: 90, align: 'right' },
    ],
    [
      ['Saisies financières', String(c.enAttente.operations)],
      ['Paiements de vente', String(c.enAttente.paiementsVente)],
      ['Mouvements de fonds', String(c.enAttente.mouvementsFonds)],
      ['Reversements à autoriser', String(c.enAttente.reversements)],
      ['Paiements de chantier', String(c.enAttente.paiementsChantier)],
    ],
    '',
  );

  assurerPlace(60);
  sectionTitle(page, cursor, 'Anomalies à traiter');
  if (c.anomalies.length === 0) {
    paragraphe(page, cursor, 'Aucune anomalie signalée.', { color: MUTED });
  } else {
    for (const anomalie of c.anomalies) {
      assurerPlace(30);
      paragraphe(page, cursor, `• ${anomalie}`);
    }
  }

  drawPied(page, data.company, pied);
  return pdf.build();
}
