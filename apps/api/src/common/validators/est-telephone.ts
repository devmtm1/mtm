import { registerDecorator, type ValidationOptions } from 'class-validator';
import { normaliserTelephone } from '../utils/telephone';

export const MESSAGE_TELEPHONE_INVALIDE =
  'Ce numéro de téléphone n’est pas valable : 9 chiffres pour le Sénégal (77 123 45 67) ou avec l’indicatif du pays (+33 6 12 34 56 78)';

/**
 * Le champ doit être un numéro de téléphone exploitable (même règle que l'identifiant de connexion d'un espace
 * client) : un texte quelconque ou une suite de chiffres sans sens est refusé.
 */
export function EstTelephone(options?: ValidationOptions): PropertyDecorator {
  return (objet, propriete) => {
    registerDecorator({
      name: 'estTelephone',
      target: objet.constructor,
      propertyName: propriete as string,
      options: { message: MESSAGE_TELEPHONE_INVALIDE, ...options },
      validator: {
        validate: (valeur: unknown) =>
          typeof valeur === 'string' && normaliserTelephone(valeur) !== null,
      },
    });
  };
}
