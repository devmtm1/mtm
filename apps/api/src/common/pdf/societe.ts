import { LOGO_PAR_DEFAUT_BASE64 } from './logo-defaut';
import {
  A4,
  parseJpeg,
  textWidth,
  wrapText,
  type PdfJpeg,
  type PdfPage,
} from './pdf-document';

/**
 * Identité de l'entreprise telle qu'elle figure sur chaque document généré :
 * logo et coordonnées en tête de page, mentions légales (forme juridique, capital,
 * NINEA, RCCM) en pied de page. Tout vient des paramètres du back-office
 * (« Identité de l'entreprise ») ; rien n'est figé dans les documents.
 */
export interface Societe {
  /** Nom commercial, en grand dans l'en-tête (MTM Immobilier). */
  name: string;
  tagline: string;
  adresse: string;
  telephone: string;
  email: string;
  /** Dénomination légale, en tête des mentions du pied de page. */
  raisonSociale?: string;
  /** SARL, SA, entreprise individuelle… */
  formeJuridique?: string;
  capital?: string;
  ninea?: string;
  rccm?: string;
  siteWeb?: string;
  banque?: string;
  /** Mention libre ajoutée au pied de page (TVA, conditions…). */
  mentionPied?: string;
  /** Logo prêt à être posé ; absent : le logo MTM par défaut est utilisé. */
  logo?: PdfJpeg | null;
}

const NAVY = '#1A4974';
const NAVY_DARK = '#233D5B';
const ACCENT = '#B52C36';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const MARGIN = 48;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

let logoDefaut: PdfJpeg | null | undefined;

/** Le logo MTM embarqué dans le code, lu une seule fois. */
export function logoParDefaut(): PdfJpeg | null {
  if (logoDefaut === undefined) {
    logoDefaut = parseJpeg(Buffer.from(LOGO_PAR_DEFAUT_BASE64, 'base64'));
  }
  return logoDefaut;
}

/** Le logo à poser : celui de la société, sinon celui de MTM. `null` seulement si aucun n'est lisible. */
export function logoDe(societe: Pick<Societe, 'logo'>): PdfJpeg | null {
  return societe.logo ?? logoParDefaut();
}

/**
 * « SARL au capital de 1 000 000 FCFA · NINEA 0123456789 · RCCM SN-DKR-2026-B-1234 » :
 * la ligne des mentions légales, ou `null` quand rien n'a été renseigné.
 */
export function ligneLegale(societe: Societe): string | null {
  const forme = societe.formeJuridique?.trim();
  const capital = societe.capital?.trim();
  const morceaux = [
    forme && capital
      ? `${forme} au capital de ${capital}`
      : forme
        ? forme
        : capital
          ? `Capital : ${capital}`
          : null,
    societe.ninea?.trim() ? `NINEA ${societe.ninea.trim()}` : null,
    societe.rccm?.trim() ? `RCCM ${societe.rccm.trim()}` : null,
  ].filter((morceau): morceau is string => Boolean(morceau));
  if (morceaux.length === 0) return null;
  const denomination = (societe.raisonSociale?.trim() || societe.name).trim();
  return [denomination, ...morceaux].join(' · ');
}

function ligneContact(societe: Societe): string {
  return [societe.adresse, societe.telephone, societe.email, societe.siteWeb]
    .map((valeur) => valeur?.trim())
    .filter(Boolean)
    .join(' · ');
}

function ligneComplement(societe: Societe): string | null {
  const morceaux = [
    societe.banque?.trim() ? `Banque : ${societe.banque.trim()}` : null,
    societe.mentionPied?.trim() || null,
  ].filter(Boolean);
  return morceaux.length ? morceaux.join(' · ') : null;
}

/**
 * Bandeau d'en-tête : le logo (rond, à gauche), le nom commercial et le slogan,
 * puis l'adresse, le téléphone et l'e-mail à droite. La couleur du bandeau
 * s'adapte au document (bleu MTM, vert du rapport de chantier).
 */
export function drawEntete(
  page: PdfPage,
  societe: Societe,
  options: { fond?: string; hauteur?: number; liseré?: boolean } = {},
): { xTexte: number } {
  const hauteur = options.hauteur ?? 92;
  page.rect(0, 0, A4.width, hauteur, options.fond ?? NAVY);
  if (options.liseré !== false) page.rect(0, hauteur, A4.width, 4, ACCENT);

  const logo = logoDe(societe);
  const taille = Math.min(66, hauteur - 20);
  let xTexte = MARGIN;
  if (logo) {
    page.image(logo, MARGIN, (hauteur - taille) / 2, taille, taille, {
      rond: true,
    });
    xTexte = MARGIN + taille + 14;
  }

  page.text(societe.name.toUpperCase(), xTexte, hauteur / 2 - 2, {
    font: 'bold',
    size: 19,
    color: '#FFFFFF',
  });
  page.text(societe.tagline, xTexte, hauteur / 2 + 14, {
    size: 8.5,
    color: '#CFE0EE',
  });

  // Bloc de droite : l'adresse peut passer sur deux lignes sans chevaucher le nom.
  const droite = A4.width - MARGIN;
  const largeurDroite = Math.min(200, droite - xTexte - 190);
  let y = hauteur / 2 - 22;
  for (const texte of [societe.adresse, societe.telephone, societe.email]) {
    if (!texte?.trim()) continue;
    const hauteurTexte = page.text(texte, droite, y, {
      size: 8.5,
      color: '#FFFFFF',
      align: 'right',
      width: Math.max(largeurDroite, 150),
      lineHeight: 11,
    });
    y += hauteurTexte;
  }
  return { xTexte };
}

/**
 * Pied de page : trait, logo, puis mentions légales, coordonnées, banque et
 * mention libre, et enfin la ligne propre au document. Les lignes se calent sur
 * le bas de la page : ajouter une mention remonte le bloc au lieu de déborder.
 */
export function drawPied(
  page: PdfPage,
  societe: Societe,
  ligneDocument: string,
): void {
  const logo = logoDe(societe);
  const decalage = logo ? 44 : 0;
  const largeur = CONTENT_WIDTH - decalage;
  const centre = MARGIN + decalage + largeur / 2;

  const blocs: { texte: string; taille: number }[] = [];
  const legale = ligneLegale(societe);
  if (legale) blocs.push({ texte: legale, taille: 7.5 });
  const contact = ligneContact(societe);
  if (contact) blocs.push({ texte: contact, taille: 7.5 });
  const complement = ligneComplement(societe);
  if (complement) blocs.push({ texte: complement, taille: 7.5 });
  blocs.push({ texte: ligneDocument, taille: 7 });

  const lignes = blocs
    .flatMap((bloc) =>
      wrapText(bloc.texte, 'regular', bloc.taille, largeur).map((texte) => ({
        texte,
        taille: bloc.taille,
      })),
    )
    // Au-delà de six lignes le pied rognerait le contenu : on garde les plus utiles.
    .slice(-6);

  const pas = 10.5;
  const derniere = A4.height - 24;
  const premiere = derniere - (lignes.length - 1) * pas;
  const trait = premiere - 14;
  page.line(MARGIN, trait, MARGIN + CONTENT_WIDTH, trait, BORDER);

  if (logo) {
    page.image(logo, MARGIN, trait + 7, 30, 30, { rond: true });
  }
  lignes.forEach((ligne, index) => {
    page.text(ligne.texte, centre, premiere + index * pas, {
      size: ligne.taille,
      color: MUTED,
      align: 'center',
    });
  });
  page.rect(0, A4.height - 6, A4.width, 6, NAVY_DARK);
}

/** Largeur d'un texte au pied de page : utile aux tests de mise en page. */
export function largeurPied(texte: string): number {
  return textWidth(texte, 'regular', 7.5);
}
