import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, Subject, catchError, concatMap, delay, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/** Pause avant de précharger les écrans les plus utilisés : les premières données passent en priorité. */
export const DELAI_PRIORITAIRES_MS = 2500;
/** Pause avant de précharger tous les autres écrans, une fois la personne bien installée dans son travail. */
export const DELAI_AUTRES_MS = 30_000;
/** Écart entre deux chargements : un seul fichier à la fois, jamais de rafale qui sature la ligne. */
export const ECART_MS = 250;

/**
 * Charge les écrans à l'avance sans gêner le travail :
 *  - ceux marqués `data: { preload: true }` (les plus ouverts) partent peu après la connexion ;
 *  - les autres partent bien plus tard ;
 *  - tous passent dans une seule file, un fichier à la fois, avec une courte pause entre deux.
 * Précharger d'un coup les 150 fichiers saturait la ligne juste après la connexion, au moment où l'on
 * commence à travailler. Sur une connexion qui économise les données (« Save-Data »), rien n'est préchargé.
 */
@Injectable({ providedIn: 'root' })
export class PreloadSelectif implements PreloadingStrategy {
  private readonly file$ = new Subject<() => Observable<unknown>>();

  constructor() {
    this.file$
      .pipe(
        concatMap((charger) => charger().pipe(catchError(() => of(null)), delay(ECART_MS))),
      )
      .subscribe();
  }

  preload(route: Route, charger: () => Observable<unknown>): Observable<unknown> {
    if (this.economiseLesDonnees()) return of(null);
    const prioritaire = !!route.data?.['preload'];
    // Connexion lente (2G, 3G) : on ne charge à l'avance que l'essentiel ; le reste se charge au clic.
    if (!prioritaire && !this.connexionRapide()) return of(null);
    const delai = prioritaire ? DELAI_PRIORITAIRES_MS : DELAI_AUTRES_MS;
    return timer(delai).pipe(
      mergeMap(() => {
        this.file$.next(charger);
        return of(null);
      }),
    );
  }

  /** Vrai sur une bonne connexion, ou quand le navigateur ne sait pas la qualifier. */
  private connexionRapide(): boolean {
    const type = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;
    return !type || type === '4g';
  }

  private economiseLesDonnees(): boolean {
    const connexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return connexion?.saveData === true;
  }
}
