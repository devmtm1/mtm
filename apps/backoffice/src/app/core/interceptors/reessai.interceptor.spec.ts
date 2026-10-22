import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELAI_REESSAI_MS, reessaiInterceptor } from './reessai.interceptor';

describe('reessaiInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([reessaiInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    controle.verify();
  });

  it('relit une fois une lecture coupée par un serveur qui redémarre, puis réussit', () => {
    let reponse: unknown;
    http.get('/api/x').subscribe((valeur) => (reponse = valeur));
    controle.expectOne('/api/x').flush('', { status: 503, statusText: 'Service Unavailable' });
    vi.advanceTimersByTime(DELAI_REESSAI_MS + 10);
    controle.expectOne('/api/x').flush({ ok: true });
    expect(reponse).toEqual({ ok: true });
  });

  it('abandonne après une seule nouvelle tentative', () => {
    let erreur: unknown;
    http.get('/api/x').subscribe({ error: (e) => (erreur = e) });
    controle.expectOne('/api/x').flush('', { status: 502, statusText: 'Bad Gateway' });
    vi.advanceTimersByTime(DELAI_REESSAI_MS + 10);
    controle.expectOne('/api/x').flush('', { status: 502, statusText: 'Bad Gateway' });
    expect(erreur).toBeTruthy();
  });

  it('ne rejoue pas une erreur de la personne (404, 400…)', () => {
    let erreur: unknown;
    http.get('/api/x').subscribe({ error: (e) => (erreur = e) });
    controle.expectOne('/api/x').flush('', { status: 404, statusText: 'Not Found' });
    vi.advanceTimersByTime(DELAI_REESSAI_MS + 10);
    expect(erreur).toBeTruthy();
  });

  it('ne rejoue jamais un enregistrement : il risquerait d’être fait deux fois', () => {
    let erreur: unknown;
    http.post('/api/x', {}).subscribe({ error: (e) => (erreur = e) });
    controle.expectOne('/api/x').flush('', { status: 503, statusText: 'Service Unavailable' });
    vi.advanceTimersByTime(DELAI_REESSAI_MS + 10);
    expect(erreur).toBeTruthy();
  });
});
