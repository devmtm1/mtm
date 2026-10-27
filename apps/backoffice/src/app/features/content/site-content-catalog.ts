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
  /** `image` : l'emplacement reçoit une image envoyée depuis le poste, pas un texte. */
  kind?: 'image';
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
      { key: 'home.hero.title', label: 'Titre principal', help: 'La phrase la plus visible du site, en grand sur la photo d’accueil. Un retour à la ligne coupe le titre en deux lignes.', multiline: true, type: 'hero' },
      { key: 'home.hero.subtitle', label: 'Sous-titre', help: 'Une ou deux phrases sous le titre : ce que MTM propose.', multiline: true, type: 'hero' },
      { key: 'home.cta.title', label: 'Texte du bouton principal', help: 'Ex. « Découvrir nos biens ».', type: 'stat' },
    ],
  },
  {
    id: 'catalogue',
    title: 'Page « Nos biens »',
    where: 'Bandeau en haut de la page « Nos biens » (les biens eux-mêmes se gèrent dans Biens à vendre)',
    slots: [
      { key: 'catalogue.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, sous un voile bleu marine : le texte blanc se lit sur n’importe quelle image. Format paysage conseillé (au moins 1600 × 900 px).', kind: 'image' },
      { key: 'catalogue.eyebrow', label: 'Mention au-dessus du titre', help: 'Petit libellé précédé d’un trait rouge, affiché en capitales. Par défaut : « Catalogue ».' },
      { key: 'catalogue.title', label: 'Titre', help: 'Le grand titre du bandeau. Par défaut : « Nos biens ».' },
      { key: 'catalogue.intro', label: 'Texte de présentation', help: 'Un court paragraphe sous le titre.', multiline: true },
      { key: 'catalogue.reassurance', label: 'Engagements du bandeau', help: 'Jusqu’à trois lignes courtes, une par engagement (ex. « Titres et documents vérifiés »).', multiline: true },
    ],
  },
  {
    id: 'locations',
    title: 'Page « Locations »',
    where: 'Bandeau en haut de la page « Locations » (les annonces elles-mêmes se gèrent dans Gestion locative)',
    slots: [
      { key: 'locations.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, sous un voile bleu marine : le texte blanc se lit sur n’importe quelle image. Format paysage conseillé (au moins 1600 × 900 px).', kind: 'image' },
      { key: 'locations.eyebrow', label: 'Mention au-dessus du titre', help: 'Petit libellé précédé d’un trait rouge, affiché en capitales. Par défaut : « Locations ».' },
      { key: 'locations.title', label: 'Titre', help: 'Le grand titre du bandeau. Par défaut : « Trouvez votre prochain logement au Sénégal ».' },
      { key: 'locations.intro', label: 'Texte de présentation', help: 'Un court paragraphe sous le titre.', multiline: true },
      { key: 'locations.reassurance', label: 'Engagements du bandeau', help: 'Jusqu’à trois lignes courtes, une par engagement (ex. « Biens contrôlés par nos équipes »).', multiline: true },
    ],
  },
  {
    id: 'realisations',
    title: 'Page « Nos réalisations »',
    where: 'Grand bandeau en haut de la page « Nos réalisations » (les projets eux-mêmes se gèrent dans Réalisations & projets)',
    slots: [
      { key: 'realisations.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, assombrie à gauche pour que le texte se lise. Format paysage conseillé (au moins 1600 × 900 px).', kind: 'image' },
      { key: 'realisations.eyebrow', label: 'Mention au-dessus du titre', help: 'Petit libellé précédé d’un trait rouge, affiché en capitales. Par défaut : « Nos réalisations ».' },
      { key: 'realisations.title', label: 'Titre', help: 'Le grand titre du bandeau. Par défaut : « Nos projets immobiliers ».' },
      { key: 'realisations.subtitle', label: 'Phrase d’accroche', help: 'Sous le titre. Par défaut : « Des opportunités foncières et résidentielles au Sénégal ».' },
      { key: 'realisations.texte', label: 'Texte de présentation', help: 'Un court paragraphe sous l’accroche.', multiline: true },
      { key: 'realisations.legende', label: 'Mention sous les projets', help: 'Facultatif : une phrase centrée sous les cartes (ex. « Visuels indicatifs »). Vide, rien n’est affiché.' },
    ],
  },
  {
    id: 'projets-a-venir',
    title: 'Page « Projets à venir »',
    where: 'Grand bandeau en haut de la page « Projets à venir » (les projets eux-mêmes se gèrent dans Réalisations & projets)',
    slots: [
      { key: 'projets-a-venir.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, assombrie à gauche pour que le texte se lise. Format paysage conseillé (au moins 1600 × 900 px).', kind: 'image' },
      { key: 'projets-a-venir.eyebrow', label: 'Mention au-dessus du titre', help: 'Petit libellé précédé d’un trait rouge, affiché en capitales. Par défaut : « Projets à venir ».' },
      { key: 'projets-a-venir.title', label: 'Titre', help: 'Le grand titre du bandeau. Par défaut : « Nos prochains projets ».' },
      { key: 'projets-a-venir.subtitle', label: 'Phrase d’accroche', help: 'Sous le titre. Par défaut : « Les programmes que MTM Immobilier prépare pour vous ».' },
      { key: 'projets-a-venir.texte', label: 'Texte de présentation', help: 'Un court paragraphe sous l’accroche.', multiline: true },
      { key: 'projets-a-venir.legende', label: 'Mention sous les projets', help: 'Facultatif : une phrase centrée sous les cartes (ex. « Visuels indicatifs — projets présentés à titre d’exemple »). Vide, rien n’est affiché.' },
    ],
  },
  {
    id: 'about',
    title: 'À propos',
    where: 'Page « À propos »',
    slots: [
      { key: 'about.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, sous un voile bleu marine : le texte blanc se lit sur n’importe quelle image. Format paysage conseillé (au moins 1600 × 900 px). Laisser vide pour la photo par défaut.', kind: 'image' },
      { key: 'about.title', label: 'Accroche', help: 'Phrase d’introduction en haut de la page.' },
      { key: 'about.text', label: 'Présentation de MTM', help: 'Histoire, valeurs, équipe. Un paragraphe par ligne.', multiline: true },
    ],
  },
  {
    id: 'contact',
    title: 'Coordonnées',
    where: 'Pied de page, page Contact (avec la carte), bouton « + » de l’application mobile, bouton WhatsApp et page Démarches',
    slots: [
      { key: 'contact.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, sous un voile bleu marine : le texte blanc se lit sur n’importe quelle image. Format paysage conseillé (au moins 1600 × 900 px). Laisser vide pour la photo par défaut.', kind: 'image' },
      { key: 'contact.adresse', label: 'Adresse', help: 'Adresse de l’agence, telle qu’affichée aux visiteurs.' },
      { key: 'contact.telephone', label: 'Téléphone', help: 'Numéro affiché (ex. +221 78 366 26 51).' },
      { key: 'contact.email', label: 'E-mail', help: 'Adresse de contact publique.' },
      { key: 'contact.whatsapp', label: 'Numéro WhatsApp', help: 'Numéro du bouton WhatsApp flottant, au format international sans espaces (ex. 221783662651).' },
      { key: 'contact.facebook', label: 'Page Facebook', help: 'Adresse complète de la page (https://www.facebook.com/…). Laissé vide, le bouton Facebook ouvre une recherche « MTM Immobilier ».' },
      { key: 'contact.tiktok', label: 'Compte TikTok', help: 'Adresse complète du compte (https://www.tiktok.com/@…). Laissé vide, le bouton TikTok ouvre une recherche « MTM Immobilier ».' },
      { key: 'contact.latitude', label: 'Position de l’agence — latitude', help: 'Pour la carte et l’itinéraire (ex. 14.7753). Dans Google Maps, un clic droit sur l’agence donne les deux nombres.' },
      { key: 'contact.longitude', label: 'Position de l’agence — longitude', help: 'Ex. -17.4081 (le signe moins compte).' },
      { key: 'contact.whatsapp.demarches', label: 'Numéro WhatsApp — démarches administratives', help: 'Numéro joint depuis la page « Démarches administratives », suivi par la direction. Même format, sans espaces. Laisser vide pour réutiliser le numéro WhatsApp général.' },
    ],
  },
  {
    id: 'actualites',
    title: 'Page « Actualités et conseils »',
    where: 'Bandeau en haut de la page « Actualités et conseils » (les vidéos se gèrent dans Actualités et conseils)',
    slots: [
      { key: 'actualites.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, sous un voile bleu marine : le texte blanc se lit sur n’importe quelle image. Format paysage conseillé (au moins 1600 × 900 px). Laisser vide pour la photo par défaut.', kind: 'image' },
    ],
  },
  {
    id: 'espace-client',
    title: 'Espace client',
    where: 'Écrans « Ma location » et « Mes dossiers » de l’espace client',
    slots: [
      {
        key: 'client.paiement',
        label: 'Comment régler ? (modes de règlement)',
        help: 'Ce que le client lit sous son solde à régler : numéros de mobile money, coordonnées bancaires, référence à indiquer. Une consigne par ligne. Laissé vide, un texte générique invite à contacter le conseiller.',
        multiline: true,
        format: 'lines',
      },
    ],
  },
  {
    id: 'gestion-locative',
    title: 'Gestion locative',
    where: 'Page « Gestion locative »',
    slots: [
      { key: 'gestion-locative.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, sous un voile bleu marine : le texte blanc se lit sur n’importe quelle image. Format paysage conseillé (au moins 1600 × 900 px). Laisser vide pour la photo par défaut.', kind: 'image' },
      { key: 'gestion-locative.eyebrow', label: 'Mention au-dessus du titre', help: 'Petit libellé précédé d’un trait rouge. Par défaut : « Nos services ».' },
      { key: 'gestion-locative.title', label: 'Titre', help: 'Le grand titre du bandeau. Par défaut : « Gestion locative ».' },
      { key: 'gestion-locative.intro', label: 'Texte d’introduction', help: 'Présentation du service, sous le titre.', multiline: true },
      { key: 'gestion-locative.reassurance', label: 'Engagements du bandeau', help: 'Jusqu’à trois lignes courtes, une par engagement (ex. « Un interlocuteur dédié »). Ne jamais y figer un taux ou un montant.', multiline: true },
      { key: 'gestion-locative.prestations', label: 'Ce que nous prenons en charge', help: 'Une prestation par ligne, au format « Titre | Description ». Six cartes s’affichent bien.', multiline: true, format: 'steps' },
      { key: 'gestion-locative.etapes', label: 'Les étapes de la gestion', help: 'Une étape par ligne, au format « Titre | Description ». Quatre étapes s’affichent bien.', multiline: true, format: 'steps' },
      { key: 'gestion-locative.faq', label: 'Questions fréquentes', help: 'Une question par ligne, au format « Question | Réponse ». Ne promettez ni délai ni montant que MTM ne peut pas tenir (le coût se donne sur devis).', multiline: true, format: 'steps' },
    ],
  },
  {
    id: 'construction',
    title: 'Construction',
    where: 'Page « Construction »',
    slots: [
      { key: 'construction.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, sous un voile bleu marine : le texte blanc se lit sur n’importe quelle image. Format paysage conseillé (au moins 1600 × 900 px). Laisser vide pour la photo par défaut.', kind: 'image' },
      { key: 'construction.intro', label: 'Texte d’introduction', help: 'Présentation du service.', multiline: true },
      { key: 'construction.etapes', label: 'Étapes du projet', help: 'Une étape par ligne, au format « Titre | Description ».', multiline: true, format: 'steps' },
    ],
  },
  {
    id: 'demarches',
    title: 'Démarches administratives',
    where: 'Page « Démarches administratives »',
    slots: [
      { key: 'demarches.image', label: 'Image du bandeau', help: 'Photo en fond du bandeau, à droite (le texte se lit sur un fondu blanc à gauche). Format paysage conseillé (au moins 1600 × 900 px), sans texte dessus. Laisser vide pour la photo par défaut.', kind: 'image' },
      { key: 'demarches.eyebrow', label: 'Mention au-dessus du titre', help: 'Petit libellé souligné de rouge, affiché en capitales. Par défaut : « Nos services ».' },
      { key: 'demarches.title', label: 'Titre', help: 'Le grand titre du bandeau : le premier mot s’affiche en bleu, la suite en rouge. Par défaut : « Démarches administratives ».' },
      { key: 'demarches.intro', label: 'Texte d’introduction', help: 'Présentation du service de vérification foncière, sous le titre.', multiline: true },
      { key: 'demarches.reassurance', label: 'Engagements du bandeau', help: 'Jusqu’à trois lignes courtes, une par engagement (ex. « Réponse sous 24 à 48h »). Ne jamais y figer un montant : les tarifs se donnent sur devis.', multiline: true },
      { key: 'demarches.bouton', label: 'Texte du bouton', help: 'Le bouton rouge du bandeau, qui ouvre le formulaire de demande. Par défaut : « Faire une demande ».' },
      { key: 'demarches.faq', label: 'Questions fréquentes', help: 'Une question par ligne, au format « Question | Réponse ». Elles s’affichent en liste dépliante au bas de la page (la première est ouverte). Ne promettez ni délai de traitement ni montant que MTM ne peut pas tenir.', multiline: true, format: 'steps' },
      { key: 'demarches.contact-intro', label: 'Texte de la section « Parlons de votre projet »', help: 'Phrase d’accueil au-dessus du formulaire, en bas de la page.', multiline: true },
      { key: 'demarches.prestations', label: 'Prestations administratives', help: 'Une prestation par ligne, au format « Titre | Description ». C’est la liste des services annoncés aux visiteurs.', multiline: true, format: 'steps' },
      { key: 'demarches.prestations-techniques', label: 'Services techniques', help: 'Plans d’architecte, de géomètre… Même format « Titre | Description », une par ligne.', multiline: true, format: 'steps' },
      { key: 'demarches.etapes', label: 'Étapes de la vérification', help: 'Une étape par ligne, au format « Titre | Description ». Ne décrit que la vérification avant achat.', multiline: true, format: 'steps' },
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
