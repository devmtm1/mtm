import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

/** Le jeton d'accès est renouvelé quand il lui reste moins que ce délai (il dure 15 minutes). */
export const AVANCE_RENOUVELLEMENT_MS = 60_000;
/** Pas de renouvellement plus rapproché : garde-fou si un jeton arrivait avec une durée anormalement courte. */
const DELAI_MINIMUM_MS = 10_000;
/** Plafond d'un minuteur navigateur (~24 jours). */
const DELAI_MAXIMUM_MS = 2_147_000_000;

/** Date d'expiration (ms) d'un jeton JWT, ou `null` s'il n'est pas lisible. */
export function expirationDuJeton(jeton: string): number | null {
  try {
    const charge = jeton.split('.')[1];
    if (!charge) return null;
    const json = atob(charge.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Renouvelle le jeton d'accès un peu avant son expiration, et au retour sur l'onglet (un ordinateur en veille ou un
 * onglet resté en arrière-plan n'a pas fait tourner ses minuteurs). Ainsi les requêtes partent presque toujours avec un
 * jeton valide : le renouvellement « de secours » sur erreur 401 devient l'exception, pas la règle.
 */
@Injectable({ providedIn: 'root' })
export class RenouvellementSessionService {
  private readonly session = inject(SessionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private minuteur: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => this.planifier(this.session.accessToken));
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this.verifier();
      });
      window.addEventListener('online', () => this.verifier());
    }
  }

  /** Reprogramme le renouvellement pour le jeton courant. */
  private planifier(jeton: string | null): void {
    if (this.minuteur) clearTimeout(this.minuteur);
    this.minuteur = null;
    if (!jeton) return;
    const expiration = expirationDuJeton(jeton);
    if (expiration === null) return;
    const delai = Math.min(
      Math.max(expiration - Date.now() - AVANCE_RENOUVELLEMENT_MS, DELAI_MINIMUM_MS),
      DELAI_MAXIMUM_MS,
    );
    this.minuteur = setTimeout(() => this.renouveler(), delai);
  }

  /** Au retour sur l'onglet : renouvelle tout de suite si le jeton est expiré ou sur le point de l'être. */
  verifier(): void {
    const jeton = this.session.accessToken;
    if (!jeton) return;
    const expiration = expirationDuJeton(jeton);
    if (expiration !== null && expiration - Date.now() <= AVANCE_RENOUVELLEMENT_MS) this.renouveler();
  }

  private renouveler(): void {
    if (!this.session.accessToken) return;
    // Onglet caché : on attend d'y revenir (voir `verifier`), inutile de réveiller l'API pour rien.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    this.auth.refresh().subscribe({
      // Seul un refus explicite ferme la session ; une panne passagère est rattrapée par le renouvellement de secours.
      error: (erreur: unknown) => {
        if (erreur instanceof HttpErrorResponse && (erreur.status === 401 || erreur.status === 403)) {
          this.session.clearSession();
          void this.router.navigate(['/login']);
        }
      },
    });
  }
}
