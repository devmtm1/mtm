import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  LucideShieldCheck,
  LucideAlertCircle,
  LucidePhoneCall,
  LucideLogIn,
} from '@lucide/angular';
import { AuthService, StaffOnlyError } from '../../../core/services/auth.service';

interface CredentialsForm {
  email: FormControl<string>;
  password: FormControl<string>;
}

interface TwoFactorForm {
  code: FormControl<string>;
}

const SENSITIVE_ROLES = new Set([
  'administrateur',
  'direction',
  'comptable',
  'rh',
]);

@Component({
  selector: 'app-login',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    LucideShieldCheck,
    LucideAlertCircle,
    LucidePhoneCall,
    LucideLogIn,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // Le lien de réinitialisation envoyé par e-mail pointe sur /login?reset=<jeton> :
    // on l'achemine vers l'écran dédié avec le jeton prérempli.
    const resetToken = this.route.snapshot.queryParamMap.get('reset');
    if (resetToken) {
      void this.router.navigate(['/password-reset'], {
        queryParams: { token: resetToken },
        replaceUrl: true,
      });
    }
  }

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** true une fois les identifiants validés, en attente du code 2FA */
  protected readonly awaitingTwoFactor = signal(false);

  protected readonly credentialsForm = new FormGroup<CredentialsForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly twoFactorForm = new FormGroup<TwoFactorForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
      ],
    }),
  });

  submitCredentials(): void {
    if (this.credentialsForm.invalid) {
      this.credentialsForm.markAllAsTouched();
      return;
    }
    this.attemptLogin();
  }

  submitTwoFactor(): void {
    if (this.twoFactorForm.invalid) {
      this.twoFactorForm.markAllAsTouched();
      return;
    }
    this.attemptLogin();
  }

  private attemptLogin(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.credentialsForm.getRawValue();
    const twoFactorCode = this.awaitingTwoFactor()
      ? this.twoFactorForm.getRawValue().code
      : undefined;

    this.authService.login(email, password, twoFactorCode).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.requiresTwoFactor) {
          this.awaitingTwoFactor.set(true);
          return;
        }
        const user = response.user;
        const destination = user?.mustChangePassword
          ? '/change-password'
          : user?.roles?.some((role) => SENSITIVE_ROLES.has(role)) &&
              !user.twoFactorEnabled
            ? '/security'
            : '/dashboard';
        void this.router.navigate([destination]);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.toErrorMessage(error));
      },
    });
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof StaffOnlyError) return error.message;
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        return this.awaitingTwoFactor()
          ? 'Code de double authentification invalide.'
          : 'Identifiants invalides.';
      }
      if (error.status === 403) {
        return typeof error.error?.message === 'string'
          ? error.error.message
          : 'Accès refusé.';
      }
      if (error.status === 429) {
        return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
      }
    }
    return 'Une erreur est survenue. Veuillez réessayer.';
  }
}
