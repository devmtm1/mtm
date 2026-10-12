import { A4, PdfDocument } from '../../common/pdf/pdf-document';
import {
  drawEntete,
  drawPied,
  ligneLegale,
  type Societe,
} from '../../common/pdf/societe';

const NAVY = '#1A4974';
const MUTED = '#6B7280';
const TEXT = '#1F2937';
const MARGIN = 48;

/**
 * Page d'essai : l'en-tête et le pied de page tels que les documents les
 * imprimeront, autour d'un texte d'exemple. Permet de vérifier le logo et les
 * mentions légales sans créer un vrai document.
 */
export function renderApercuEntreprise(societe: Societe): Buffer {
  const pdf = new PdfDocument('Aperçu des documents');
  const page = pdf.addPage();
  drawEntete(page, societe);

  page.text('APERÇU DES DOCUMENTS', MARGIN, 140, {
    font: 'bold',
    size: 18,
    color: NAVY,
  });
  page.text(
    'Voici l’en-tête et le pied de page de vos factures, rapports, contrats et quittances.',
    MARGIN,
    162,
    { size: 10, color: MUTED, width: A4.width - MARGIN * 2 },
  );

  const mentions = ligneLegale(societe);
  const lignes = [
    ['Nom commercial', societe.name],
    ['Dénomination légale', societe.raisonSociale || '— (non renseignée)'],
    ['NINEA', societe.ninea || '— (non renseigné)'],
    ['RCCM', societe.rccm || '— (non renseigné)'],
    [
      'Forme juridique et capital',
      [societe.formeJuridique, societe.capital].filter(Boolean).join(' · ') ||
        '— (non renseignés)',
    ],
  ];
  let y = 210;
  for (const [libelle, valeur] of lignes) {
    page.text(libelle, MARGIN, y, { font: 'bold', size: 9.5, color: TEXT });
    page.text(valeur, MARGIN + 170, y, { size: 9.5, color: TEXT, width: 320 });
    y += 20;
  }
  if (!mentions) {
    page.text(
      'Aucune mention légale n’est renseignée : le pied de page n’affiche que vos coordonnées.',
      MARGIN,
      y + 12,
      { size: 9, color: '#B7791F', width: A4.width - MARGIN * 2 },
    );
  }

  drawPied(page, societe, 'Aperçu — document généré pour vérification');
  return pdf.build();
}
