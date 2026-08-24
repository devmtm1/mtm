import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valide que deux champs d'un même FormGroup ont la même valeur (ex:
 * nouveau mot de passe / confirmation). L'erreur est posée sur le champ
 * de confirmation, pas sur le groupe, pour un affichage plus naturel.
 */
export function matchFieldsValidator(
  fieldName: string,
  matchFieldName: string,
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const field = group.get(fieldName);
    const matchField = group.get(matchFieldName);
    if (!field || !matchField) return null;

    if (matchField.value && field.value !== matchField.value) {
      matchField.setErrors({ ...matchField.errors, mismatch: true });
    } else if (matchField.errors) {
      const { mismatch, ...rest } = matchField.errors;
      void mismatch;
      matchField.setErrors(Object.keys(rest).length ? rest : null);
    }

    return null;
  };
}
