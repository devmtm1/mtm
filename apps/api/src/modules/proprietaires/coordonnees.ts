/**
 * Coordonnées des propriétaires (e-mail, téléphone) : réservées à l'administrateur, pour que
 * l'équipe ne les appelle pas en dehors du travail. Les autres voient tout le reste de la fiche
 * et reconnaissent le propriétaire à son matricule.
 */

interface Demandeur {
  roles?: string[];
}

/** Sans utilisateur (traitement interne : alertes, documents), rien n'est masqué. */
export function voitCoordonneesProprietaires(user?: Demandeur): boolean {
  return !user || Boolean(user.roles?.includes('administrateur'));
}

const MASQUEES = { email: null, phone: null, coordonneesMasquees: true };
/** L'identité (pièce, état civil, adresse) est aussi réservée à l'administrateur. */
const PIECE = [
  'typePiece',
  'numeroPiece',
  'pieceUrl',
  'adresse',
  'dateNaissance',
  'lieuNaissance',
  'nationalite',
  'profession',
  'pieceValiditeLe',
  'urgenceNom',
  'urgenceLien',
  'urgenceTelephone',
] as const;

/** Copie du propriétaire sans e-mail ni téléphone (marqué `coordonneesMasquees`) si le demandeur n'est pas administrateur. */
export function masquerCoordonnees<T extends object>(
  proprietaire: T,
  user?: Demandeur,
): T {
  if (voitCoordonneesProprietaires(user)) return proprietaire;
  return {
    ...proprietaire,
    ...('email' in proprietaire ? { email: MASQUEES.email } : {}),
    ...('phone' in proprietaire ? { phone: MASQUEES.phone } : {}),
    ...Object.fromEntries(
      PIECE.filter((cle) => cle in proprietaire).map((cle) => [cle, null]),
    ),
    coordonneesMasquees: true,
  };
}

/** Masque le propriétaire (et le téléphone du vendeur) d'une fiche terrain ou mandat. */
export function masquerCoordonneesDeLaFiche<T extends object>(
  fiche: T,
  user?: Demandeur,
): T {
  if (voitCoordonneesProprietaires(user)) return fiche;
  const { proprietaire } = fiche as { proprietaire?: object | null };
  return {
    ...fiche,
    ...(proprietaire
      ? { proprietaire: masquerCoordonnees(proprietaire, user) }
      : {}),
    ...('contactVendeurTelephone' in fiche
      ? { contactVendeurTelephone: null }
      : {}),
  };
}
