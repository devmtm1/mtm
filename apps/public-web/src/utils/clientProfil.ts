/**
 * Ce que ce compte utilise vraiment : un propriétaire ou un locataire n'a pas de dossier de vente, et lui montrer
 * « Dossiers » ou « Vérifications » au même rang que « Mon bien » brouille son espace. Tant que les données se chargent,
 * on garde tout visible pour que la barre d'onglets ne change pas sous les doigts.
 */
export interface EntreesProfil {
  chargement: boolean;
  nbDossiers: number;
  nbMissions: number;
  gestion: boolean;
  chantier: boolean;
}

export interface ProfilClient {
  /** « Dossiers » : des ventes en cours, ou un compte qui n'a rien d'autre. */
  dossiers: boolean;
  /** « Vérifications » : déjà demandées, ou compte d'acheteur. */
  verifications: boolean;
  /** Le client a acheté ou va acheter : le texte « Comment ça marche ? » des ventes le concerne. */
  acheteur: boolean;
}

export function profilClient({ chargement, nbDossiers, nbMissions, gestion, chantier }: EntreesProfil): ProfilClient {
  const acheteur = chargement || nbDossiers > 0 || (!gestion && !chantier);
  return {
    dossiers: acheteur,
    verifications: acheteur || nbMissions > 0,
    acheteur,
  };
}
