/** Un pôle d'activité de MTM, tel que le site public le reçoit (voir l'API /poles). */
export interface Pole {
  id: string;
  /** Ancre stable dans la page (/nos-services#clean). */
  slug: string;
  /** « 01 », « 02 »… selon l'ordre d'affichage. */
  numero: string;
  nom: string;
  accroche: string | null;
  /** Phrase courte des cartes de l'accueil. */
  description: string | null;
  /** Les prestations, une par puce. */
  points: string[];
  imageUrl: string | null;
  /** Chemin du site (/terrains) ou adresse https. */
  lienUrl: string | null;
  libelleLien: string | null;
  /** Montré parmi les services de l'accueil. */
  surAccueil: boolean;
  /** Identifiants des pôles proposés en complément sur la page de celui-ci. */
  lies: string[];
}
