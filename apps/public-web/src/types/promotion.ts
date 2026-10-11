/** Publicité ou promotion de MTM, affichée à la place de la vidéo du bandeau d'accueil. */
export interface Promotion {
  id: string;
  titre: string;
  /** Courte légende affichée sur le bandeau. */
  description: string | null;
  type: 'image' | 'video';
  mediaUrl: string | null;
  /** Image fixe d'une vidéo, montrée avant la lecture ou quand la vidéo est écartée. */
  posterUrl: string | null;
  /** Chemin du site (/terrains) ou adresse https. */
  lienUrl: string | null;
  libelleLien: string | null;
}
