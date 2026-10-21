export type RubriquePublication = 'conseil' | 'actualite' | 'foncier' | 'construction' | 'autre';

/** Vidéo de la page « Actualités et conseils » : un conseil, une actualité du foncier… */
export interface Publication {
  id: string;
  titre: string;
  categorie: RubriquePublication;
  resume: string | null;
  /** Fichier vidéo hébergé par MTM ; vide quand la vidéo vient de YouTube. */
  videoUrl: string | null;
  /** Identifiant d'une vidéo YouTube, lue dans la page sans quitter le site. */
  youtubeId: string | null;
  /** Image fixe tirée de la vidéo : montrée avant la lecture. */
  posterUrl: string | null;
  dureeSecondes: number | null;
  largeur: number | null;
  hauteur: number | null;
  /** Date ISO affichée (publication, à défaut création). */
  datePublication: string;
  misEnAvant: boolean;
}
