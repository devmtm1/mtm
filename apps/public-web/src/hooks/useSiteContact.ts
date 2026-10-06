import { useContentBlocks } from './useContentBlocks';

/**
 * Coordonnées de l'entreprise, administrables depuis le back-office
 * (blocs de contenu `contact.*`). Des valeurs de repli sont fournies pour
 * que le site reste affichable si un bloc n'a pas encore été créé.
 */
export interface SiteContact {
  adresse: string;
  telephone: string;
  email: string;
  /** Numéro WhatsApp au format international sans « + » (ex. 221770000000). */
  whatsapp: string;
  /**
   * Numéro WhatsApp dédié aux démarches administratives, que la direction
   * suit elle-même. À défaut de bloc dédié, on retombe sur le numéro général
   * pour qu'aucun bouton ne reste sans destinataire.
   */
  whatsappDemarches: string;
  /** Page Facebook ; à défaut de lien au back-office, la recherche « MTM Immobilier ». */
  facebook: string;
  /** Compte TikTok ; à défaut de lien au back-office, la recherche « MTM Immobilier ». */
  tiktok: string;
  /** Position de l'agence, pour la carte et l'itinéraire. */
  latitude: number;
  longitude: number;
}

const FALLBACK: SiteContact = {
  adresse: 'Malibou, Cité Dalal Diam, non loin de l’hôpital Dalal Diam, Dakar',
  telephone: '+221 78 366 26 51',
  email: 'contact@mtm-immobilier.sn',
  whatsapp: '221783662651',
  whatsappDemarches: '221771551810',
  // Tant que les liens officiels ne sont pas saisis au back-office, les boutons
  // ouvrent la recherche du nom de l'agence : ils restent utiles, sans adresse inventée.
  facebook: 'https://www.facebook.com/search/top?q=MTM%20Immobilier',
  tiktok: 'https://www.tiktok.com/search?q=MTM%20Immobilier',
  // Quartier de Malibou (Guédiawaye), repéré sur OpenStreetMap : à affiner au
  // back-office (contact.latitude, contact.longitude) avec la position exacte.
  latitude: 14.7753,
  longitude: -17.4081,
};

/** Un lien saisi au back-office n'est repris que s'il s'agit d'une adresse https. */
function lienSur(valeur: string): string {
  return /^https:\/\/\S+$/i.test(valeur) ? valeur : '';
}

function coordonnee(valeur: string, secours: number, limite: number): number {
  const nombre = Number(valeur.replace(',', '.'));
  return valeur !== '' && Number.isFinite(nombre) && Math.abs(nombre) <= limite ? nombre : secours;
}

export function useSiteContact(): SiteContact {
  const { data } = useContentBlocks();

  const get = (key: string, fallback: string): string =>
    data?.find((block) => block.key === key)?.content?.trim() || fallback;

  const whatsapp = get('contact.whatsapp', FALLBACK.whatsapp);

  return {
    adresse: get('contact.adresse', FALLBACK.adresse),
    telephone: get('contact.telephone', FALLBACK.telephone),
    email: get('contact.email', FALLBACK.email),
    whatsapp,
    whatsappDemarches: get('contact.whatsapp.demarches', whatsapp),
    facebook: lienSur(get('contact.facebook', '')) || FALLBACK.facebook,
    tiktok: lienSur(get('contact.tiktok', '')) || FALLBACK.tiktok,
    latitude: coordonnee(get('contact.latitude', ''), FALLBACK.latitude, 90),
    longitude: coordonnee(get('contact.longitude', ''), FALLBACK.longitude, 180),
  };
}

/** Numéro de téléphone au format utilisable dans un lien `tel:`. */
export function toTelHref(telephone: string): string {
  return `tel:${telephone.replace(/[^\d+]/g, '')}`;
}

/** Lien d'itinéraire vers l'agence : ouvre l'application de cartes du téléphone. */
export function toMapsHref({ latitude, longitude }: Pick<SiteContact, 'latitude' | 'longitude'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
