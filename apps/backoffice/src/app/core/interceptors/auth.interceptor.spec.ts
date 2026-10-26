import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';
import { authInterceptor } from './auth.interceptor';

const REFRESH = `${environment.apiUrl}/auth/refresh`;
const NON_AUTORISE = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor : jeton expiré', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  let session: SessionService;
  const router = { navigate: vi.fn() } as unknown as Router;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    session.updateAccessToken('vieux');
  });

  afterEach(() => controle.verify());

  it('ne demande qu’UN renouvellement quand plusieurs requêtes sont refusées en même temps, puis rejoue toutes les requêtes', async () => {
    const reponses = [firstValueFrom(http.get('/api/a')), firstValueFrom(http.get('/api/b')), firstValueFrom(http.get('/api/c'))];
    const envoyees = [controle.expectOne('/api/a'), controle.expectOne('/api/b'), controle.expectOne('/api/c')];
    envoyees.forEach((requete) => {
      expect(requete.request.headers.get('Authorization')).toBe('Bearer vieux');
      requete.flush({}, NON_AUTORISE);
    });

    // un seul renouvellement, pas trois
    controle.expectOne(REFRESH).flush({ accessToken: 'neuf' });

    for (const chemin of ['/api/a', '/api/b', '/api/c']) {
      const rejeu = controle.expectOne(chemin);
      expect(rejeu.request.headers.get('Authorization')).toBe('Bearer neuf');
      rejeu.flush({ ok: chemin });
    }
    await expect(Promise.all(reponses)).resolves.toEqual([{ ok: '/api/a' }, { ok: '/api/b' }, { ok: '/api/c' }]);
    expect(session.accessToken).toBe('neuf');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('rejoue sans redemander de renouvellement si le jeton a déjà été renouvelé entre-temps', async () => {
    const reponse = firstValueFrom(http.get('/api/a'));
    const envoyee = controle.expectOne('/api/a');
    // une autre requête a renouvelé le jeton pendant que celle-ci attendait sa réponse
    session.updateAccessToken('deja-neuf');
    envoyee.flush({}, NON_AUTORISE);

    controle.expectNone(REFRESH);
    const rejeu = controle.expectOne('/api/a');
    expect(rejeu.request.headers.get('Authorization')).toBe('Bearer deja-neuf');
    rejeu.flush({ ok: true });
    await expect(reponse).resolves.toEqual({ ok: true });
  });

  it('ferme la session quand le renouvellement est refusé', async () => {
    const reponses = [
      firstValueFrom(http.get('/api/a')).catch((e: unknown) => e),
      firstValueFrom(http.get('/api/b')).catch((e: unknown) => e),
    ];
    controle.expectOne('/api/a').flush({}, NON_AUTORISE);
    controle.expectOne('/api/b').flush({}, NON_AUTORISE);
    controle.expectOne(REFRESH).flush({}, NON_AUTORISE);

    await Promise.all(reponses);
    expect(session.accessToken).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('ne déconnecte pas quand la requête rejouée reçoit un 403 (droit insuffisant) : ce n’est pas un refus du renouvellement', async () => {
    const reponse = firstValueFrom(http.get('/api/a')).catch((e: { status: number }) => e.status);
    controle.expectOne('/api/a').flush({}, NON_AUTORISE);
    controle.expectOne(REFRESH).flush({ accessToken: 'neuf' });
    controle.expectOne('/api/a').flush({}, { status: 403, statusText: 'Forbidden' });

    await expect(reponse).resolves.toBe(403);
    expect(session.accessToken).toBe('neuf');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ne déconnecte pas non plus quand la requête rejouée reçoit encore un 401 : l’erreur revient à celui qui l’a demandée', async () => {
    const reponse = firstValueFrom(http.get('/api/a')).catch((e: { status: number }) => e.status);
    controle.expectOne('/api/a').flush({}, NON_AUTORISE);
    controle.expectOne(REFRESH).flush({ accessToken: 'neuf' });
    controle.expectOne('/api/a').flush({}, NON_AUTORISE);

    await expect(reponse).resolves.toBe(401);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('ne ferme pas la session sur une panne passagère du renouvellement', async () => {
    const reponse = firstValueFrom(http.get('/api/a')).catch((e: unknown) => e);
    controle.expectOne('/api/a').flush({}, NON_AUTORISE);
    controle.expectOne(REFRESH).flush({}, { status: 503, statusText: 'Service Unavailable' });

    await reponse;
    expect(session.accessToken).toBe('vieux');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
