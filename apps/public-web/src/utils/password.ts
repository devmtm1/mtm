/**
 * Reflet de la contrainte class-validator du backend
 * (ChangePasswordDto/ResetPasswordDto : @Length(12,200) + regex) — donne un
 * retour immédiat côté client, la validation serveur reste l'autorité.
 */
const COMPLEXITY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_HELP_TEXT =
  'Au moins 12 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.';

export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 12) return 'Le mot de passe doit contenir au moins 12 caractères.';
  if (!COMPLEXITY_PATTERN.test(password)) return PASSWORD_HELP_TEXT;
  return null;
}
