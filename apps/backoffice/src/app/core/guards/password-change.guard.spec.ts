import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { passwordChangeGuard } from './password-change.guard';
import { SessionService } from '../services/session.service';
import type { AuthenticatedUser } from '../models/auth.model';

describe('passwordChangeGuard', () => {
  let sessionService: SessionService;
  let router: Router;

  const buildUser = (mustChangePassword: boolean): AuthenticatedUser => ({
    id: 'u1',
    email: 'test@mtm.sn',
    firstName: 'Test',
    lastName: 'User',
    roles: [],
    permissions: [],
    mustChangePassword,
    twoFactorEnabled: false,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    sessionService = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => passwordChangeGuard({} as never, {} as never));
  }

  it('autorise si aucun utilisateur en session', () => {
    expect(runGuard()).toBe(true);
  });

  it('autorise si mustChangePassword=false', () => {
    sessionService.setSession('token', buildUser(false));

    expect(runGuard()).toBe(true);
  });

  it('redirige vers /change-password si mustChangePassword=true', () => {
    sessionService.setSession('token', buildUser(true));

    const result = runGuard();

    expect(result).toEqual(router.createUrlTree(['/change-password']));
  });
});
