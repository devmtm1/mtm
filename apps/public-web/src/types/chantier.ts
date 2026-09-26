/**
 * Suivi de chantier vu par le client (J2.3, section 16 du cahier des
 * charges : « espace client permettant de consulter l'avancement et les
 * rapports autorisés »).
 *
 * Ces types ne portent volontairement ni budget interne ni marge : l'API ne
 * les expose pas à cet endroit. Le client voit ce qu'il a signé — le devis —
 * l'avancement de son chantier, le planning, les journées que MTM publie et
 * les pièces qui lui sont destinées.
 */

export interface ClientChantierTerrain {
  nom: string;
  referenceInterne: string | null;
}

export interface ClientChantierJalon {
  id: string;
  libelle: string;
  statut: string;
  avancement: number;
  dateDebutPrevue: string | null;
  dateFinPrevue: string | null;
  dateFinReelle: string | null;
}

export interface ClientChantierDocument {
  id: string;
  title: string | null;
  type: string;
  version?: number;
  createdAt?: string;
  secureUrl: string;
}

/** Une journée publiée par MTM. */
export interface ClientChantierJournee {
  id: string;
  date: string;
  intervenants: string | null;
  avancement: number | null;
  observations: string | null;
  decisions: string | null;
  prochaineAction: string | null;
  documents: ClientChantierDocument[];
}

/** Ligne de la liste des chantiers du client. */
export interface ClientChantier {
  id: string;
  referenceInterne: string;
  intitule: string;
  typeProjet: string;
  adresse: string | null;
  commune: string | null;
  statut: string;
  avancement: number;
  montantDevis: number | null;
  dateDebutPrevue: string | null;
  dateFinPrevue: string | null;
  dateFinReelle: string | null;
  terrain: ClientChantierTerrain | null;
}

/** Fiche d'un chantier vue par son client. */
export interface ClientChantierDetail extends ClientChantier {
  programme: string | null;
  region: string | null;
  surfaceBatie: number | null;
  nombreNiveaux: number | null;
  dateDebutReelle: string | null;
  responsable: { firstName: string | null; lastName: string | null } | null;
  jalons: ClientChantierJalon[];
  journal: ClientChantierJournee[];
  documents: ClientChantierDocument[];
}
