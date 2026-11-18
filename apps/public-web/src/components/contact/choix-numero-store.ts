import { useSyncExternalStore } from 'react';

/** État partagé de la fenêtre « Quel numéro appeler ? » : n'importe quel bouton d'appel l'ouvre, une seule fenêtre existe. */
let ouvert = false;
const abonnes = new Set<() => void>();

function changer(valeur: boolean): void {
  ouvert = valeur;
  abonnes.forEach((abonne) => abonne());
}

export const ouvrirChoixNumero = (): void => changer(true);
export const fermerChoixNumero = (): void => changer(false);

export function useChoixNumeroOuvert(): boolean {
  return useSyncExternalStore(
    (abonne) => {
      abonnes.add(abonne);
      return () => abonnes.delete(abonne);
    },
    () => ouvert,
    () => false,
  );
}

/**
 * Pour un lien « Appeler » : le lien `tel:` reste en place (il fonctionne sans JavaScript), mais le clic ouvre le choix du
 * numéro au lieu de lancer l'appel tout de suite.
 */
export function surClicAppel(evenement: { preventDefault: () => void }): void {
  evenement.preventDefault();
  ouvrirChoixNumero();
}
