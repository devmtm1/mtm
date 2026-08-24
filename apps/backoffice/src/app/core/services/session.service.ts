import { Injectable, computed, signal } from '@angular/core';
import type { AuthenticatedUser } from '../models/auth.model';

/**
 * Détient l'état de session en mémoire (signals). L'access token n'est
 * JAMAIS persisté en localStorage/sessionStorage — uniquement en mémoire
 * — pour limiter la surface d'exposition XSS. Le refresh token, lui,
 * vit exclusivement dans un cookie httpOnly géré par le backend et
 * n'est jamais accessible en JavaScript.
 *
 * Conséquence assumée : un rechargement de page (F5) perd l'access
 * token ; AuthService doit alors appeler /auth/refresh pour en obtenir
 * un nouveau à partir du cookie httpOnly (voir étape "Angular Auth").
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<AuthenticatedUser | null>(null);

  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => this.accessTokenSignal() !== null);
  readonly permissions = computed(() => this.userSignal()?.permissions ?? []);

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  setSession(accessToken: string, user: AuthenticatedUser): void {
    this.accessTokenSignal.set(accessToken);
    this.userSignal.set(user);
  }

  setUser(user: AuthenticatedUser): void {
    this.userSignal.set(user);
  }

  /**
   * Met à jour partiellement l'utilisateur en session (ex: après un
   * changement de mot de passe ou une activation/désactivation du 2FA),
   * sans repasser par un appel réseau complet.
   */
  patchUser(partial: Partial<AuthenticatedUser>): void {
    const current = this.userSignal();
    if (!current) return;
    this.userSignal.set({ ...current, ...partial });
  }

  updateAccessToken(accessToken: string): void {
    this.accessTokenSignal.set(accessToken);
  }

  clearSession(): void {
    this.accessTokenSignal.set(null);
    this.userSignal.set(null);
  }

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }
}
