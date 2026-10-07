import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ContactApiService, type ContactMessage } from './contact-api.service';

describe('ContactApiService', () => {
  let service: ContactApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ContactApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('répond à un message : le texte part vers l’API et le résultat dit si l’e-mail est parti', async () => {
    const attente = firstValueFrom(service.repondre('c1', 'Bonjour, le titre est vérifié.'));

    const requete = http.expectOne(`${environment.apiUrl}/contact/c1/repondre`);
    expect(requete.request.method).toBe('POST');
    expect(requete.request.body).toEqual({ reponse: 'Bonjour, le titre est vérifié.' });
    const contact = { id: 'c1', reponse: 'Bonjour, le titre est vérifié.' } as ContactMessage;
    requete.flush({ contact, emailEnvoye: true });

    await expect(attente).resolves.toEqual({ contact, emailEnvoye: true });
  });
});
