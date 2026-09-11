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
}

const FALLBACK: SiteContact = {
  adresse: 'Dakar, Sénégal',
  telephone: '+221 77 000 00 00',
  email: 'contact@mtm-immobilier.sn',
  whatsapp: '221770000000',
};

export function useSiteContact(): SiteContact {
  const { data } = useContentBlocks();

  const get = (key: string, fallback: string): string =>
    data?.find((block) => block.key === key)?.content?.trim() || fallback;

  return {
    adresse: get('contact.adresse', FALLBACK.adresse),
    telephone: get('contact.telephone', FALLBACK.telephone),
    email: get('contact.email', FALLBACK.email),
    whatsapp: get('contact.whatsapp', FALLBACK.whatsapp),
  };
}

/** Numéro de téléphone au format utilisable dans un lien `tel:`. */
export function toTelHref(telephone: string): string {
  return `tel:${telephone.replace(/[^\d+]/g, '')}`;
}
