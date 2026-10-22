import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { ConfirmService } from '../../shared/dialogs/confirm-dialog';

/** Écran à formulaire qui sait dire si la personne a saisi quelque chose qui n'est pas encore enregistré. */
export interface AvecModifications {
  aDesModifications(): boolean;
}

/**
 * Avant de quitter un formulaire modifié, demande confirmation : un clic sur un lien du menu au milieu
 * d'une longue saisie ne doit pas tout effacer sans prévenir.
 */
export const modificationsNonEnregistreesGuard: CanDeactivateFn<AvecModifications> = (ecran) => {
  if (!ecran.aDesModifications()) return true;
  return inject(ConfirmService).ask({
    title: 'Quitter sans enregistrer ?',
    message: 'Ce que vous avez saisi n’est pas enregistré. Si vous quittez cet écran, ces informations seront perdues.',
    confirmLabel: 'Quitter sans enregistrer',
    cancelLabel: 'Continuer la saisie',
    danger: true,
  });
};
