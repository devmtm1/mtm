import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthenticatedUser, LoginResponse } from '../models/auth.model';
import { SessionService } from './session.service';

/**
 * Le back-office est réservé au personnel MTM : un compte « client »
 * (espace client du site public) ne s'y connecte pas, même avec des
 * identifiants valides.
 */
export class StaffOnlyError extends Error {
  constructor() {
    super('Cet espace est réservé au personnel MTM. Les clients se connectent depuis l’espace client du site.');
    this.name = 'StaffOnlyError';
  }
}

export function isStaffUser(user: Pick<AuthenticatedUser, 'roles'>): boolean {
  return (user.roles ?? []).some((role) => role !== 'client');
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionService = inject(SessionService);

  /**
   * Client HTTP séparé, construit directement sur HttpBackend : il ne
   * passe PAS par authInterceptor. Indispensable pour l'appel de refresh,
   * qui est lui-même déclenché DEPUIS l'intercepteur en cas de 401 — un
   * client classique créerait une boucle infinie.
   */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  login(
    email: string,
    password: string,
    twoFactorCode?: string,
  ): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/login`,
        { email, password, twoFactorCode },
        { withCredentials: true },
      )
      .pipe(
        switchMap((response) => {
          if (!response.requiresTwoFactor && response.user && !isStaffUser(response.user)) {
            // On révoque tout de suite le cookie de session posé par l'API
            // (l'appel est authentifié par le jeton qu'on vient de recevoir) ;
            // quel que soit son résultat, la connexion est refusée.
            return this.rawHttp
              .post(
                `${environment.apiUrl}/auth/logout`,
                {},
                { withCredentials: true, headers: { Authorization: `Bearer ${response.accessToken}` } },
              )
              .pipe(
                catchError(() => [null]),
                switchMap(() => throwError(() => new StaffOnlyError())),
              );
          }
          if (!response.requiresTwoFactor && response.accessToken && response.user) {
            this.sessionService.setSession(response.accessToken, response.user);
          }
          return [response];
        }),
      );
  }

  refresh(): Observable<{ accessToken: string }> {
    return this.rawHttp.post<{ accessToken: string }>(
      `${environment.apiUrl}/auth/refresh`,
      {},
      { withCredentials: true },
    );
  }

  logout(): Observable<{ success: boolean }> {
    return this.http
      .post<{ success: boolean }>(
        `${environment.apiUrl}/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(tap(() => this.sessionService.clearSession()));
  }

  /**
   * Tente de restaurer une session à partir du cookie refresh token
   * httpOnly (ex: après un F5, qui perd l'access token gardé en mémoire).
   * Utilisé par authGuard.
   */
  restoreSession(): Observable<AuthenticatedUser> {
    return this.refresh().pipe(
      switchMap(({ accessToken }) => {
        this.sessionService.updateAccessToken(accessToken);
        // Passe par `http` (pas `rawHttp`) : authInterceptor attache
        // l'Authorization Bearer à partir du token qu'on vient de fixer.
        return this.http.get<AuthenticatedUser>(`${environment.apiUrl}/auth/me`);
      }),
      map((user) => {
        if (!isStaffUser(user)) {
          this.sessionService.clearSession();
          throw new StaffOnlyError();
        }
        return user;
      }),
      tap((user) => this.sessionService.setUser(user)),
    );
  }

  /**
   * Demande de réinitialisation : réponse toujours « acceptée » (anti-énumération).
   * Hors production sans SMTP, l'API renvoie le jeton pour la recette.
   */
  requestPasswordReset(email: string): Observable<{ accepted: true; developmentToken?: string }> {
    return this.rawHttp.post<{ accepted: true; developmentToken?: string }>(
      `${environment.apiUrl}/auth/password-reset/request`,
      { email },
    );
  }

  confirmPasswordReset(token: string, newPassword: string): Observable<{ success: boolean }> {
    return this.rawHttp.post<{ success: boolean }>(
      `${environment.apiUrl}/auth/password-reset/confirm`,
      { token, newPassword },
    );
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${environment.apiUrl}/auth/change-password`,
      { currentPassword, newPassword },
    );
  }

  setupTwoFactor(): Observable<{ otpauthUrl: string; qrCodeDataUrl: string }> {
    return this.http.post<{ otpauthUrl: string; qrCodeDataUrl: string }>(
      `${environment.apiUrl}/auth/2fa/setup`,
      {},
    );
  }

  confirmTwoFactor(code: string): Observable<{ recoveryCodes?: string[] }> {
    return this.http.post<{ recoveryCodes?: string[] }>(
      `${environment.apiUrl}/auth/2fa/confirm`,
      { code },
    );
  }

  disableTwoFactor(currentPassword: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${environment.apiUrl}/auth/2fa/disable`,
      { currentPassword },
    );
  }
}
