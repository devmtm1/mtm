import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { AVANCE_RENOUVELLEMENT_MS, RenouvellementSessionService, expirationDuJeton } from './renouvellement-session.service';
import { SessionService } from './session.service';

const REFRESH = `${environment.apiUrl}/auth/refresh`;

/** Jeton JWT de test, expirant dans `secondes` secondes. */
function jeton(secondes: number): string {
  const charge = btoa(JSON.stringify({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + secondes }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `eyJhbGciOiJIUzI1NiJ9.${charge}.signature`;
}

describe('expirationDuJeton', () => {
  it('lit la date d’expiration d’un jeton JWT', () => {
    const attendu = Math.floor(Date.now() / 1000) + 900;
    expect(Math.round((expirationDuJeton(jeton(900)) as number) / 1000)).toBe(attendu);
  });

  it('rend null pour un jeton illisible', () => {
    expect(expirationDuJeton('pas-un-jeton')).toBeNull();
    expect(expirationDuJeton('a.%%%.c')).toBeNull();
  });
});

describe('RenouvellementSessionService', () => {
  let controle: HttpTestingController;
  let session: SessionService;
  let service: RenouvellementSessionService;
  const router = { navigate: vi.fn() } as unknown as Router;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    controle = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    service = TestBed.inject(RenouvellementSessionService);
  });

  afterEach(() => {
    vi.useRealTimers();
    controle.verify();
  });

  it('renouvelle le jeton un peu avant son expiration', async () => {
    session.updateAccessToken(jeton(900));
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(900_000 - AVANCE_RENOUVELLEMENT_MS - 5_000);
    controle.expectNone(REFRESH);
    await vi.advanceTimersByTimeAsync(10_000);
    controle.expectOne(REFRESH).flush({ accessToken: jeton(900) });
    expect(session.accessToken).not.toBeNull();
  });

  it('renouvelle tout de suite au retour sur l’onglet si le jeton est périmé', () => {
    session.updateAccessToken(jeton(-30));
    service.verifier();
    controle.expectOne(REFRESH).flush({ accessToken: jeton(900) });
  });

  it('ne fait rien si le jeton est encore largement valable', () => {
    session.updateAccessToken(jeton(900));
    service.verifier();
    controle.expectNone(REFRESH);
  });

  it('ferme la session seulement quand le renouvellement est refusé', () => {
    session.updateAccessToken(jeton(-30));
    service.verifier();
    controle.expectOne(REFRESH).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.accessToken).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('garde la session sur une panne passagère', () => {
    session.updateAccessToken(jeton(-30));
    service.verifier();
    controle.expectOne(REFRESH).flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(session.accessToken).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
