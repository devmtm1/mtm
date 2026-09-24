/** Réponse d'une ouverture de compte client (prospect, propriétaire ou locataire). */
export interface ClientAccountCreated {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** true si l'e-mail d'invitation est parti. */
  invitationSent: boolean;
  /** Jeton de première connexion, uniquement quand l'e-mail n'a pas pu partir. */
  resetToken?: string;
}
