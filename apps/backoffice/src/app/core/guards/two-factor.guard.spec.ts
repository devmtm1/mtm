import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { twoFactorGuard } from './two-factor.guard';
import { SessionService } from '../services/session.service';

describe('twoFactorGuard', () => {
  const router = {
    createUrlTree: vi.fn((commands: string[]) => commands),
  } as unknown as Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SessionService, { provide: Router, useValue: router }],
    });
    vi.clearAllMocks();
  });

  it('redirige un compte sensible sans 2FA vers Sécurité', () => {
    const session = TestBed.inject(SessionService);
    session.setSession('token', {
      id: '1',
      email: 'admin@mtm.sn',
      firstName: 'Admin',
      lastName: 'MTM',
      roles: ['administrateur'],
      permissions: [],
      mustChangePassword: false,
      twoFactorEnabled: false,
    });

    const result = TestBed.runInInjectionContext(() =>
      twoFactorGuard({ routeConfig: { path: 'terrains' } } as ActivatedRouteSnapshot, {} as never),
    );

    expect(result).toEqual(['/security']);
  });

  it('autorise la route Sécurité sans 2FA', () => {
    const session = TestBed.inject(SessionService);
    session.setSession('token', {
      id: '1',
      email: 'admin@mtm.sn',
      firstName: 'Admin',
      lastName: 'MTM',
      roles: ['administrateur'],
      permissions: [],
      mustChangePassword: false,
      twoFactorEnabled: false,
    });

    const result = TestBed.runInInjectionContext(() =>
      twoFactorGuard({ routeConfig: { path: 'security' } } as ActivatedRouteSnapshot, {} as never),
    );

    expect(result).toBe(true);
  });

  it('autorise un compte sensible déjà sécurisé', () => {
    const session = TestBed.inject(SessionService);
    session.setSession('token', {
      id: '1',
      email: 'admin@mtm.sn',
      firstName: 'Admin',
      lastName: 'MTM',
      roles: ['administrateur'],
      permissions: [],
      mustChangePassword: false,
      twoFactorEnabled: true,
    });

    const result = TestBed.runInInjectionContext(() =>
      twoFactorGuard({ routeConfig: { path: 'terrains' } } as ActivatedRouteSnapshot, {} as never),
    );

    expect(result).toBe(true);
  });
});
