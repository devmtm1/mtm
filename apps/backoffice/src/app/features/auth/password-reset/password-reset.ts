import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LucideAlertCircle, LucideKeyRound, LucideMailCheck } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { matchFieldsValidator } from '../../../core/validators/match-fields.validator';
import {
  passwordPolicyValidator,
  PASSWORD_POLICY_HINT,
} from '../../../core/validators/password-policy.validator';
import { NotificationService } from '../../../shared/services/notification.service';

type Step = 'request' | 'sent' | 'confirm' | 'done';

/**
 * Mot de passe oublié (section 27 CDC — récupération de compte sécurisée).
 *
 * 1. Saisie de l'e-mail → l'API envoie un lien « /login?reset=<jeton> ».
 * 2. Le lien ouvre cette page avec le jeton prérempli ; l'utilisateur choisit
 *    un nouveau mot de passe, soumis à la même politique que le serveur.
 * Le jeton peut aussi être saisi à la main (e-mail lu sur un autre appareil).
 */
@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    LucideAlertCircle,
    LucideKeyRound,
    LucideMailCheck,
  ],
  templateUrl: './password-reset.html',
  styleUrl: '../login/login.scss',
})
export class PasswordReset {
  private readonly authService = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly step = signal<Step>('request');

  protected readonly requestForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly confirmForm = new FormGroup(
    {
      token: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(64), Validators.maxLength(64)],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordPolicyValidator()],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: matchFieldsValidator('newPassword', 'confirmPassword') },
  );

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.confirmForm.controls.token.setValue(token);
      this.step.set('confirm');
    }
  }

  protected submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.requestPasswordReset(this.requestForm.getRawValue().email).subscribe({
      next: (result) => {
        this.loading.set(false);
        // Hors production sans SMTP, l'API renvoie le jeton : on préremplit.
        if (result.developmentToken) this.confirmForm.controls.token.setValue(result.developmentToken);
        this.step.set('sent');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(NotificationService.extractMessage(error) ?? 'La demande a échoué. Réessayez.');
      },
    });
  }

  protected goToConfirm(): void {
    this.step.set('confirm');
  }

  protected submitConfirm(): void {
    if (this.confirmForm.invalid) {
      this.confirmForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const { token, newPassword } = this.confirmForm.getRawValue();
    this.authService.confirmPasswordReset(token.trim(), newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set('done');
        this.notify.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
        void this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          NotificationService.extractMessage(error) ?? 'Lien invalide ou expiré. Refaites une demande.',
        );
      },
    });
  }
}
