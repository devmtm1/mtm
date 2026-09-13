import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Politique de l'API (section 27 CDC) : 12 caractères, majuscule, minuscule, chiffre, spécial. */
export const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_POLICY_HINT =
  'Au moins 12 caractères, avec majuscule, minuscule, chiffre et caractère spécial.';

/**
 * Même règle que le serveur, vérifiée avant l'envoi : l'utilisateur voit
 * l'exigence sous le champ au lieu de découvrir une erreur 400 après coup.
 */
export function passwordPolicyValidator(): ValidatorFn {
  return (control: AbstractControl<string | null>): ValidationErrors | null => {
    const value = control.value ?? '';
    if (!value) return null;
    if (value.length < PASSWORD_MIN_LENGTH || !PASSWORD_PATTERN.test(value)) {
      return { passwordPolicy: true };
    }
    return null;
  };
}
