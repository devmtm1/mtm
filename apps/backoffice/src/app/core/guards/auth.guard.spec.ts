import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, type Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { authGuard, DELAI_REPRISE_MS } from './auth.guard';

const REFRESH = `${environment.apiUrl}/auth/refresh`;
const ME = `${environment.apiUrl}/auth/me`;
const UTILISATEUR = {
  id: 'u1',
  email: 'a@mtm.test',
  firstName: 'A',
  lastName: 'B',
  roles: ['commercial'],
  permissions: [],
  mustChangePassword: false,
  twoFactorEnabled: false,
};

interface UrlFactice {
  commandes: string[];
  extras: unknown;
}

describe('authGuard : restauration de la session', () => {
  let controle: HttpTestingController;
  const router = {
    createUrlTree: vi.fn((commandes: string[], extras?: unknown) => ({ commandes, extras }) as unknown as UrlTree),
  } as unknown as Router;

  const lancer = () =>
    firstValueFrom(
      TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Observable<boolean | UrlTree>,
    );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    controle = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    controle.verify();
  });

  it('restaure la session avec le cookie', async () => {
    const resultat = lancer();
    controle.expectOne(REFRESH).flush({ accessToken: 'jeton' });
    controle.expectOne(ME).flush(UTILISATEUR);
    await expect(resultat).resolves.toBe(true);
  });

  it('réessaie une panne passagère du serveur au lieu de renvoyer à la connexion', async () => {
    const resultat = lancer();
    controle.expectOne(REFRESH).flush({}, { status: 503, statusText: 'Service Unavailable' });
    await vi.advanceTimersByTimeAsync(DELAI_REPRISE_MS + 10);
    controle.expectOne(REFRESH).flush({ accessToken: 'jeton' });
    controle.expectOne(ME).flush(UTILISATEUR);
    await expect(resultat).resolves.toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('renvoie à la connexion, en le disant, si le serveur reste muet', async () => {
    const resultat = lancer();
    for (let essai = 1; essai <= 4; essai++) {
      controle.expectOne(REFRESH).flush({}, { status: 0, statusText: 'Unknown Error' });
      await vi.advanceTimersByTimeAsync(DELAI_REPRISE_MS * essai + 10);
    }
    const url = (await resultat) as unknown as UrlFactice;
    expect(url.commandes).toEqual(['/login']);
    expect(url.extras).toEqual({ queryParams: { raison: 'serveur' } });
  });

  it('renvoie à la connexion, sans réessayer, quand la session est refusée', async () => {
    const resultat = lancer();
    controle.expectOne(REFRESH).flush({}, { status: 401, statusText: 'Unauthorized' });
    const url = (await resultat) as unknown as UrlFactice;
    expect(url.commandes).toEqual(['/login']);
    expect(url.extras).toEqual({});
  });
});
