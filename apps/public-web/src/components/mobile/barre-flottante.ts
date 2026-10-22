import { useSyncExternalStore } from 'react';

/**
 * Visibilité de la barre d'onglets flottante : elle se range quand on lit vers le bas et revient
 * dès qu'on remonte (comme Facebook Lite). L'état est partagé : le bouton d'actions rapides
 * descend avec elle au lieu de rester suspendu dans le vide.
 */

/** Mouvement minimal, en pixels, avant de réagir : un doigt qui tremble ne fait pas clignoter la barre. */
export const SEUIL_PX = 10;
/** Tout en haut de la page, la barre est toujours visible. */
const HAUT_PX = 8;

export interface EtatDefilement {
  visible: boolean;
  /** Position de référence : celle du dernier mouvement pris en compte. */
  reference: number;
}

/** Calcul pur, testable : que devient la barre après un défilement vers `y` ? */
export function prochainEtat(etat: EtatDefilement, y: number, hauteurPage: number, hauteurFenetre: number): EtatDefilement {
  const position = Math.max(0, y);
  const enBas = position + hauteurFenetre >= hauteurPage - HAUT_PX;
  if (position <= HAUT_PX || enBas) return { visible: true, reference: position };
  const ecart = position - etat.reference;
  if (Math.abs(ecart) < SEUIL_PX) return etat;
  return { visible: ecart < 0, reference: position };
}

let etat: EtatDefilement = { visible: true, reference: 0 };
const abonnes = new Set<() => void>();
let installe = false;

function changer(suivant: EtatDefilement): void {
  const changement = suivant.visible !== etat.visible;
  etat = suivant;
  if (changement) abonnes.forEach((abonne) => abonne());
}

function installer(): void {
  if (installe || typeof window === 'undefined') return;
  installe = true;
  etat = { visible: true, reference: window.scrollY };
  window.addEventListener(
    'scroll',
    () => changer(prochainEtat(etat, window.scrollY, document.documentElement.scrollHeight, window.innerHeight)),
    { passive: true },
  );
}

function sAbonner(rappel: () => void): () => void {
  installer();
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/** `true` tant que la barre doit être visible. */
export function useBarreVisible(): boolean {
  return useSyncExternalStore(
    sAbonner,
    () => etat.visible,
    () => true,
  );
}

/** Remet la barre en place et repart de la position courante (changement de page, fermeture d'une fenêtre). */
export function reinitialiserBarre(): void {
  if (typeof window === 'undefined') return;
  changer({ visible: true, reference: window.scrollY });
}

/** Réaffiche la barre sans toucher à la position de référence (focus clavier dans la barre). */
export function montrerBarre(): void {
  changer({ ...etat, visible: true });
}
