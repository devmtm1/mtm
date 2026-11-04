/** Réponse d'une ouverture de compte client (prospect, propriétaire ou locataire). */
export interface ClientAccountCreated {
  id: string;
  /** Absent quand le client s'est ouvert un espace avec son seul numéro de téléphone. */
  email: string | null;
  /** Numéro de connexion (format international), pour un compte qui en a un. */
  telephone?: string | null;
  firstName: string;
  lastName: string;
  /** true si l'invitation (e-mail, WhatsApp ou SMS) est partie. */
  invitationSent: boolean;
  /** Par où l'invitation est partie ; absent ou `null` quand rien n'a pu partir. */
  canalInvitation?: 'email' | 'whatsapp' | 'sms' | null;
  /** Jeton de première connexion, uniquement quand l'invitation n'a pas pu partir. */
  resetToken?: string;
  /** true si le client avait déjà un espace : le nouvel accès y a été ajouté, son mot de passe est inchangé. */
  compteExistant?: boolean;
}
