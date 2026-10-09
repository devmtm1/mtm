export interface TeamPerson {
  id: string;
  nom: string;
  poste: string | null;
  message: string | null;
  imageUrl: string | null;
}

export interface TeamGroup {
  id: string;
  legende: string;
  imageUrl: string | null;
}

/** Réponse de GET /team : uniquement ce qui est publié. */
export interface TeamPage {
  directeur: TeamPerson | null;
  groupe: TeamGroup | null;
  membres: TeamPerson[];
}
