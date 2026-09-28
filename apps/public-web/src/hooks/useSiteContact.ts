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
}

const FALLBACK: SiteContact = {
  adresse: 'Dakar, Sénégal',
  telephone: '+221 78 366 26 51',
  email: 'contact@mtm-immobilier.sn',
  whatsapp: '221783662651',
  whatsappDemarches: '221771551810',
};

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
  };
}

/** Numéro de téléphone au format utilisable dans un lien `tel:`. */
export function toTelHref(telephone: string): string {
  return `tel:${telephone.replace(/[^\d+]/g, '')}`;
}
