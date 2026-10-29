/**
 * La fiche d'une personne (prospect, propriétaire ou locataire) : les mêmes champs d'identité, quelle que soit la
 * table d'où elle vient. Chaque fiche les range dans ce format avant de les passer aux composants communs.
 */
export interface DonneesFiche {
  prenom?: string | null;
  nom?: string | null;
  telephone?: string | null;
  whatsapp?: boolean | null;
  email?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  dateNaissance?: string | null;
  lieuNaissance?: string | null;
  nationalite?: string | null;
  profession?: string | null;
  typePiece?: string | null;
  numeroPiece?: string | null;
  pieceValiditeLe?: string | null;
  /** Lien de la copie PDF ; absent pour un prospect, dont les pièces sont dans ses documents. */
  pieceUrl?: string | null;
  urgenceNom?: string | null;
  urgenceLien?: string | null;
  urgenceTelephone?: string | null;
}

/** Compte d'espace client rattaché à une fiche : seulement son existence et sa dernière connexion. */
export interface CompteEspaceClient {
  id: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Completude {
  rempli: number;
  total: number;
  pourcentage: number;
  /** Libellés des informations qui manquent, dans l'ordre de la fiche. */
  manquants: string[];
}

const rempli = (valeur: string | null | undefined): boolean => !!valeur?.trim();

/**
 * Ce qu'il reste à renseigner sur une fiche. `avecCopiePdf` : la copie de la pièce est attendue sur la fiche elle-même
 * (propriétaire, locataire) ; pour un prospect elle se dépose dans ses documents et ne compte pas.
 */
export function completudeFiche(donnees: DonneesFiche, avecCopiePdf: boolean): Completude {
  const criteres: { libelle: string; ok: boolean }[] = [
    { libelle: 'Prénom', ok: rempli(donnees.prenom) },
    { libelle: 'Nom', ok: rempli(donnees.nom) },
    { libelle: 'Téléphone', ok: rempli(donnees.telephone) },
    { libelle: 'E-mail', ok: rempli(donnees.email) },
    { libelle: 'Adresse', ok: rempli(donnees.adresse) },
    { libelle: 'Date de naissance', ok: rempli(donnees.dateNaissance) },
    { libelle: 'Nationalité', ok: rempli(donnees.nationalite) },
    { libelle: 'Type de pièce', ok: rempli(donnees.typePiece) },
    { libelle: 'Numéro de pièce', ok: rempli(donnees.numeroPiece) },
    { libelle: 'Validité de la pièce', ok: rempli(donnees.pieceValiditeLe) },
    {
      libelle: 'Personne à prévenir',
      ok: rempli(donnees.urgenceNom) && rempli(donnees.urgenceTelephone),
    },
    ...(avecCopiePdf ? [{ libelle: 'Copie de la pièce (PDF)', ok: rempli(donnees.pieceUrl) }] : []),
  ];
  const nombre = criteres.filter((critere) => critere.ok).length;
  return {
    rempli: nombre,
    total: criteres.length,
    pourcentage: Math.round((nombre / criteres.length) * 100),
    manquants: criteres.filter((critere) => !critere.ok).map((critere) => critere.libelle),
  };
}

/** État de la pièce d'identité par rapport à sa date de validité. */
export type ValiditePiece =
  | { etat: 'inconnue' }
  | { etat: 'valide'; jours: number }
  | { etat: 'bientot'; jours: number }
  | { etat: 'expiree'; jours: number };

/** Une pièce qui expire dans moins de 60 jours est signalée : mieux vaut en demander une nouvelle avant. */
export const SEUIL_PIECE_BIENTOT_JOURS = 60;

export function validitePiece(
  valideJusquau: string | null | undefined,
  aujourdhui = new Date(),
): ValiditePiece {
  if (!rempli(valideJusquau)) return { etat: 'inconnue' };
  const fin = new Date(valideJusquau as string);
  if (Number.isNaN(fin.getTime())) return { etat: 'inconnue' };
  const debutJournee = Date.UTC(
    aujourdhui.getFullYear(),
    aujourdhui.getMonth(),
    aujourdhui.getDate(),
  );
  const jours = Math.round(
    (Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate()) - debutJournee) /
      86_400_000,
  );
  if (jours < 0) return { etat: 'expiree', jours: -jours };
  return jours <= SEUIL_PIECE_BIENTOT_JOURS
    ? { etat: 'bientot', jours }
    : { etat: 'valide', jours };
}
