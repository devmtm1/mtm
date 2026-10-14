import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';
import { SessionService } from '../core/services/session.service';
import type { CompteurNavigation } from './navigation-config';

export type Compteurs = Partial<Record<CompteurNavigation, number>>;

/** Délai minimal entre deux interrogations déclenchées par la navigation. */
const DELAI_MIN_MS = 20_000;
/** Mise à jour périodique tant que l'écran est ouvert. */
const PERIODE_MS = 60_000;

/**
 * Les pastilles du menu : ce qui attend la personne (messages à lire, paiements
 * à valider, relances à envoyer…). Un seul appel léger au serveur, qui ne compte
 * que ce que les droits de la personne permettent. Une erreur n'affiche rien :
 * un menu sans pastille vaut mieux qu'un menu qui se plaint.
 */
@Injectable({ providedIn: 'root' })
export class NavCompteursService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly compteurs = signal<Compteurs>({});

  private derniere = 0;
  private demarre = false;

  /** À appeler une fois, par le menu. */
  demarrer(): void {
    if (this.demarre) return;
    this.demarre = true;
    this.rafraichir(true);
    this.router.events
      .pipe(filter((evenement) => evenement instanceof NavigationEnd))
      .subscribe(() => this.rafraichir());
    const minuteur = window.setInterval(() => {
      if (document.visibilityState === 'visible') this.rafraichir(true);
    }, PERIODE_MS);
    this.destroyRef.onDestroy(() => window.clearInterval(minuteur));
  }

  private rafraichir(forcer = false): void {
    if (!this.session.isAuthenticated()) return;
    const maintenant = Date.now();
    if (!forcer && maintenant - this.derniere < DELAI_MIN_MS) return;
    this.derniere = maintenant;
    this.http.get<Compteurs>(`${environment.apiUrl}/navigation/compteurs`).subscribe({
      next: (compteurs) => this.compteurs.set(compteurs),
      error: () => undefined,
    });
  }
}

/** Valeur de la pastille d'une entrée : rien à 0, « 99+ » au-delà. */
export function texteCompteur(valeur: number | undefined): string | null {
  if (!valeur || valeur <= 0) return null;
  return valeur > 99 ? '99+' : String(valeur);
}
