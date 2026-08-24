import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Login } from './login';
import { AuthService } from '../../../core/services/auth.service';

describe('Login', () => {
  let authServiceMock: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authServiceMock = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture;
  }

  function fillCredentials(
    fixture: ReturnType<typeof createComponent>,
    email: string,
    password: string,
  ) {
    const emailInput = fixture.debugElement.query(
      By.css('input[formControlName="email"]'),
    ).nativeElement as HTMLInputElement;
    const passwordInput = fixture.debugElement.query(
      By.css('input[formControlName="password"]'),
    ).nativeElement as HTMLInputElement;

    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submitForm(fixture: ReturnType<typeof createComponent>) {
    const form = fixture.debugElement.query(By.css('form'))
      .nativeElement as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('ne soumet pas si le formulaire est invalide (champs vides)', () => {
    const fixture = createComponent();

    submitForm(fixture);

    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('ne soumet pas avec un email au format invalide', () => {
    const fixture = createComponent();

    fillCredentials(fixture, 'pas-un-email', 'motdepasse');
    submitForm(fixture);

    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('appelle AuthService.login avec les identifiants saisis', () => {
    authServiceMock.login.mockReturnValue(
      of({ requiresTwoFactor: false, accessToken: 't', user: {} }),
    );
    const fixture = createComponent();

    fillCredentials(fixture, 'admin@mtm-immobilier.sn', 'MotDePasse123!');
    submitForm(fixture);

    expect(authServiceMock.login).toHaveBeenCalledWith(
      'admin@mtm-immobilier.sn',
      'MotDePasse123!',
      undefined,
    );
  });

  it('redirige vers /dashboard après un login réussi sans 2FA', () => {
    authServiceMock.login.mockReturnValue(
      of({ requiresTwoFactor: false, accessToken: 't', user: {} }),
    );
    const fixture = createComponent();

    fillCredentials(fixture, 'admin@mtm-immobilier.sn', 'MotDePasse123!');
    submitForm(fixture);

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('redirige vers /change-password si mustChangePassword=true', () => {
    authServiceMock.login.mockReturnValue(
      of({
        requiresTwoFactor: false,
        accessToken: 't',
        user: { mustChangePassword: true },
      }),
    );
    const fixture = createComponent();

    fillCredentials(fixture, 'admin@mtm-immobilier.sn', 'MotDePasse123!');
    submitForm(fixture);

    expect(router.navigate).toHaveBeenCalledWith(['/change-password']);
  });

  it('affiche le champ code 2FA si requiresTwoFactor=true, sans rediriger', () => {
    authServiceMock.login.mockReturnValue(of({ requiresTwoFactor: true }));
    const fixture = createComponent();

    fillCredentials(fixture, 'admin@mtm-immobilier.sn', 'MotDePasse123!');
    submitForm(fixture);

    const codeInput = fixture.debugElement.query(
      By.css('input[formControlName="code"]'),
    );
    expect(codeInput).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('soumet le code 2FA avec les identifiants mémorisés', () => {
    authServiceMock.login.mockReturnValue(of({ requiresTwoFactor: true }));
    const fixture = createComponent();

    fillCredentials(fixture, 'admin@mtm-immobilier.sn', 'MotDePasse123!');
    submitForm(fixture);

    authServiceMock.login.mockReturnValue(
      of({ requiresTwoFactor: false, accessToken: 't', user: {} }),
    );
    const codeInput = fixture.debugElement.query(
      By.css('input[formControlName="code"]'),
    ).nativeElement as HTMLInputElement;
    codeInput.value = '123456';
    codeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    submitForm(fixture);

    expect(authServiceMock.login).toHaveBeenLastCalledWith(
      'admin@mtm-immobilier.sn',
      'MotDePasse123!',
      '123456',
    );
  });

  it('affiche un message d’erreur générique sur 401', () => {
    authServiceMock.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    const fixture = createComponent();

    fillCredentials(fixture, 'admin@mtm-immobilier.sn', 'mauvais');
    submitForm(fixture);

    const errorEl = fixture.debugElement.query(By.css('.login-error'));
    expect(errorEl.nativeElement.textContent).toContain('Identifiants invalides');
  });

  it('affiche un message de rate-limit sur 429', () => {
    authServiceMock.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 429 })),
    );
    const fixture = createComponent();

    fillCredentials(fixture, 'admin@mtm-immobilier.sn', 'x');
    submitForm(fixture);

    const errorEl = fixture.debugElement.query(By.css('.login-error'));
    expect(errorEl.nativeElement.textContent).toContain('Trop de tentatives');
  });
});
