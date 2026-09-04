import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthenticatedUser, LoginResponse } from '../models/auth.model';
import { SessionService } from './session.service';

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
        tap((response) => {
          if (!response.requiresTwoFactor && response.accessToken && response.user) {
            this.sessionService.setSession(response.accessToken, response.user);
          }
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
      tap((user) => this.sessionService.setUser(user)),
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
