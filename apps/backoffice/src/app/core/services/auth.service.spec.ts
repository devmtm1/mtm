import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthenticatedUser } from '../models/auth.model';
import { AuthService, StaffOnlyError, isStaffUser } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  let service: AuthService;
  let session: SessionService;
  let http: HttpTestingController;

  const buildUser = (roles: string[]): AuthenticatedUser => ({
    id: 'u1',
    email: 'user@mtm.test',
    firstName: 'Awa',
    lastName: 'Client',
    roles,
    permissions: [],
    mustChangePassword: false,
    twoFactorEnabled: false,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    session = TestBed.inject(SessionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('distingue le personnel des comptes client', () => {
    expect(isStaffUser({ roles: ['commercial'] })).toBe(true);
    expect(isStaffUser({ roles: ['client', 'commercial'] })).toBe(true);
    expect(isStaffUser({ roles: ['client'] })).toBe(false);
    expect(isStaffUser({ roles: [] })).toBe(false);
  });

  it('ouvre la session d’un membre du personnel', async () => {
    const pending = firstValueFrom(service.login('user@mtm.test', 'secret'));
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'jwt',
      user: buildUser(['commercial']),
    });

    await pending;
    expect(session.isAuthenticated()).toBe(true);
  });

  it('refuse un compte client et révoque la session côté API', async () => {
    const pending = firstValueFrom(service.login('client@mtm.test', 'secret'));
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({
      accessToken: 'jwt',
      user: buildUser(['client']),
    });
    // Le cookie de session est révoqué avant de signaler le refus.
    http.expectOne(`${environment.apiUrl}/auth/logout`).flush({ success: true });

    await expect(pending).rejects.toBeInstanceOf(StaffOnlyError);
    expect(session.isAuthenticated()).toBe(false);
  });

  it('ne restaure pas la session d’un compte client', async () => {
    const pending = firstValueFrom(service.restoreSession());
    http.expectOne(`${environment.apiUrl}/auth/refresh`).flush({ accessToken: 'jwt' });
    http.expectOne(`${environment.apiUrl}/auth/me`).flush(buildUser(['client']));

    await expect(pending).rejects.toBeInstanceOf(StaffOnlyError);
    expect(session.isAuthenticated()).toBe(false);
    expect(session.user()).toBeNull();
  });
});
