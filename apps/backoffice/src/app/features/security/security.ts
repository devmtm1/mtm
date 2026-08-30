import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { Router } from '@angular/router';

type TwoFactorStep = 'status' | 'setup' | 'disable';

interface ConfirmForm {
  code: FormControl<string>;
}

interface DisableForm {
  currentPassword: FormControl<string>;
}

@Component({
  selector: 'app-security',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './security.html',
  styleUrl: './security.scss',
})
export class Security {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sessionService = inject(SessionService);

  protected readonly step = signal<TwoFactorStep>('status');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly qrCodeDataUrl = signal<string | null>(null);
  protected readonly otpauthUrl = signal<string | null>(null);

  protected readonly confirmForm = new FormGroup<ConfirmForm>({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
    }),
  });

  protected readonly disableForm = new FormGroup<DisableForm>({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  startSetup(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.setupTwoFactor().subscribe({
      next: ({ qrCodeDataUrl, otpauthUrl }) => {
        this.loading.set(false);
        this.qrCodeDataUrl.set(qrCodeDataUrl);
        this.otpauthUrl.set(otpauthUrl);
        this.step.set('setup');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set("Impossible de générer la configuration 2FA.");
      },
    });
  }

  confirmSetup(): void {
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { code } = this.confirmForm.getRawValue();

    this.authService.confirmTwoFactor(code).subscribe({
      next: () => {
        this.loading.set(false);
        this.sessionService.patchUser({ twoFactorEnabled: true });
        this.step.set('status');
        this.confirmForm.reset();
        void this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Code invalide.');
      },
    });
  }

  cancelSetup(): void {
    this.step.set('status');
    this.qrCodeDataUrl.set(null);
    this.otpauthUrl.set(null);
    this.confirmForm.reset();
    this.errorMessage.set(null);
  }

  startDisable(): void {
    this.step.set('disable');
    this.errorMessage.set(null);
  }

  confirmDisable(): void {
    if (this.disableForm.invalid) {
      this.disableForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { currentPassword } = this.disableForm.getRawValue();

    this.authService.disableTwoFactor(currentPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.sessionService.patchUser({ twoFactorEnabled: false });
        this.step.set('status');
        this.disableForm.reset();
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Mot de passe incorrect.'
            : 'Une erreur est survenue.',
        );
      },
    });
  }

  cancelDisable(): void {
    this.step.set('status');
    this.disableForm.reset();
    this.errorMessage.set(null);
  }
}
