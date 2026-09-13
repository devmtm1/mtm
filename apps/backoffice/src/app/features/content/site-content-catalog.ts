/**
 * Catalogue des contenus que le site public lit réellement (apps/public-web).
 * Chaque emplacement a une clé technique, un libellé et une aide : le
 * back-office montre « Titre principal de la page d'accueil », pas
 * « home.hero.title ». Si un emplacement n'est pas renseigné, le site
 * affiche son texte par défaut.
 */
export interface ContentSlot {
  key: string;
  label: string;
  help: string;
  /** Saisie sur plusieurs lignes. */
  multiline?: boolean;
  /** Format attendu pour les listes. */
  format?: 'lines' | 'steps';
  type?: 'text' | 'hero' | 'stat';
}

export interface ContentSection {
  id: string;
  title: string;
  /** Où cela apparaît sur le site. */
  where: string;
  slots: ContentSlot[];
}

export const SITE_CONTENT_SECTIONS: ContentSection[] = [
  {
    id: 'home',
    title: 'Page d’accueil',
    where: 'Bandeau d’en-tête de la page d’accueil',
    slots: [
      { key: 'home.hero.title', label: 'Titre principal', help: 'La phrase la plus visible du site, en grand sur la photo d’accueil.', type: 'hero' },
      { key: 'home.hero.subtitle', label: 'Sous-titre', help: 'Une ou deux phrases sous le titre : ce que MTM propose.', multiline: true, type: 'hero' },
      { key: 'home.cta.title', label: 'Texte du bouton principal', help: 'Ex. « Découvrir nos terrains ».', type: 'stat' },
    ],
  },
  {
    id: 'about',
    title: 'À propos',
    where: 'Page « À propos »',
    slots: [
      { key: 'about.title', label: 'Accroche', help: 'Phrase d’introduction en haut de la page.' },
      { key: 'about.text', label: 'Présentation de MTM', help: 'Histoire, valeurs, équipe. Un paragraphe par ligne.', multiline: true },
    ],
  },
  {
    id: 'contact',
    title: 'Coordonnées',
    where: 'Pied de page, page Contact et bouton WhatsApp',
    slots: [
      { key: 'contact.adresse', label: 'Adresse', help: 'Adresse de l’agence, telle qu’affichée aux visiteurs.' },
      { key: 'contact.telephone', label: 'Téléphone', help: 'Numéro affiché (ex. +221 78 522 65 65).' },
      { key: 'contact.email', label: 'E-mail', help: 'Adresse de contact publique.' },
      { key: 'contact.whatsapp', label: 'Numéro WhatsApp', help: 'Numéro du bouton WhatsApp flottant, au format international sans espaces (ex. 221785226565).' },
    ],
  },
  {
    id: 'gestion-locative',
    title: 'Gestion locative',
    where: 'Page « Gestion locative »',
    slots: [
      { key: 'gestion-locative.intro', label: 'Texte d’introduction', help: 'Présentation du service.', multiline: true },
      { key: 'gestion-locative.points', label: 'Points forts', help: 'Une ligne par point (ex. « Encaissement des loyers »).', multiline: true, format: 'lines' },
    ],
  },
  {
    id: 'construction',
    title: 'Construction',
    where: 'Page « Construction »',
    slots: [
      { key: 'construction.intro', label: 'Texte d’introduction', help: 'Présentation du service.', multiline: true },
      { key: 'construction.etapes', label: 'Étapes du projet', help: 'Une étape par ligne, au format « Titre | Description ».', multiline: true, format: 'steps' },
    ],
  },
  {
    id: 'demarches',
    title: 'Démarches administratives',
    where: 'Page « Démarches administratives »',
    slots: [
      { key: 'demarches.intro', label: 'Texte d’introduction', help: 'Présentation du service de vérification foncière.', multiline: true },
      { key: 'demarches.etapes', label: 'Étapes de la vérification', help: 'Une étape par ligne, au format « Titre | Description ».', multiline: true, format: 'steps' },
    ],
  },
];

export const TESTIMONIAL_TYPE = 'testimonial';
export const NEWS_KEY_PATTERN = /^news\.(\d+)\.(title|tag|excerpt)$/;

export function slotByKey(key: string): ContentSlot | undefined {
  for (const section of SITE_CONTENT_SECTIONS) {
    const slot = section.slots.find((item) => item.key === key);
    if (slot) return slot;
  }
  return undefined;
}
