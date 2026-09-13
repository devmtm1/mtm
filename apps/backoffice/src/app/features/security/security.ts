import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { LucideKeyRound, LucideShieldAlert, LucideShieldCheck } from '@lucide/angular';
import { NotificationService } from '../../shared/services/notification.service';
import { requiresTwoFactor, roleHelp, roleLabel } from '../admin/admin-labels';
import { AuthService } from '../../core/services/auth.service';
import { SessionService } from '../../core/services/session.service';
import { Router } from '@angular/router';

type TwoFactorStep = 'status' | 'setup' | 'recovery-codes' | 'disable';

interface ConfirmForm {
  code: FormControl<string>;
}

interface DisableForm {
  currentPassword: FormControl<string>;
}

@Component({
  selector: 'app-security',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, LucideKeyRound, LucideShieldAlert, LucideShieldCheck],
  templateUrl: './security.html',
  styleUrl: './security.scss',
})
export class Security {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly sessionService = inject(SessionService);
  private readonly notify = inject(NotificationService);

  protected readonly user = this.sessionService.user;
  protected readonly roleLabel = roleLabel;
  protected readonly roleHelp = roleHelp;
  protected readonly twoFactorRequired = computed(() => requiresTwoFactor(this.user()?.roles ?? []));

  protected readonly step = signal<TwoFactorStep>('status');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly qrCodeDataUrl = signal<string | null>(null);
  protected readonly otpauthUrl = signal<string | null>(null);
  protected readonly recoveryCodes = signal<string[]>([]);

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
      next: (res) => {
        this.loading.set(false);
        this.sessionService.patchUser({ twoFactorEnabled: true });
        this.recoveryCodes.set(res.recoveryCodes || []);
        this.step.set('recovery-codes');
        this.confirmForm.reset();
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Code invalide ou expiré : vérifiez l’heure de votre téléphone et réessayez avec le code affiché maintenant.');
      },
    });
  }

  /** Clé à saisir manuellement si le QR code ne peut pas être scanné. */
  protected manualSecret(): string {
    const url = this.otpauthUrl();
    if (!url) return '';
    const match = /[?&]secret=([^&]+)/.exec(url);
    return match ? decodeURIComponent(match[1]).replace(/(.{4})/g, '$1 ').trim() : '';
  }

  protected copyCodes(): void {
    void navigator.clipboard?.writeText(this.recoveryCodes().join('\n')).then(
      () => this.notify.success('Codes copiés : collez-les dans un endroit sûr'),
      () => this.notify.error(null, 'Copie impossible : notez les codes manuellement'),
    );
  }

  finishRecoveryCodes(): void {
    this.step.set('status');
    void this.router.navigate(['/dashboard']);
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
