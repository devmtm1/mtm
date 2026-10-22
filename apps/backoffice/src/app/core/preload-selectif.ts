import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/** Pause avant de précharger : les premières données de l'écran d'accueil passent en priorité. */
export const DELAI_PRECHARGEMENT_MS = 2500;

/**
 * Ne précharge que les écrans marqués `data: { preload: true }` (ceux qu'on ouvre le plus souvent).
 * Précharger les 150 fichiers de l'application saturait la ligne juste après la connexion, au moment
 * où l'on commence à travailler ; les autres écrans se chargent au clic, en un instant.
 */
@Injectable({ providedIn: 'root' })
export class PreloadSelectif implements PreloadingStrategy {
  preload(route: Route, charger: () => Observable<unknown>): Observable<unknown> {
    if (!route.data?.['preload']) return of(null);
    return timer(DELAI_PRECHARGEMENT_MS).pipe(mergeMap(() => charger()));
  }
}
