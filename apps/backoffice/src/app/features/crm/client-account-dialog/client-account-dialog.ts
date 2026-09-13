import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';
import { passwordPolicyValidator, PASSWORD_POLICY_HINT } from '../../../core/validators/password-policy.validator';
import { environment } from '../../../../environments/environment';

export interface ClientAccountDialogData {
  prospectId: string;
  email: string;
  name: string;
}

@Component({
  selector: 'app-client-account-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './client-account-dialog.html',
  styles: `
    .account-dialog { display: grid; gap: 12px; min-width: min(480px, calc(100vw - 96px)); }
    .account-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .account-dialog__field { width: 100%; }
    .account-dialog__box { display: grid; gap: 6px; margin: 0; padding: 12px 14px; border: 1px solid; border-radius: 10px; font-size: 0.86rem; line-height: 1.5; }
    .account-dialog__box p { margin: 0; }
    .account-dialog__box--success { border-color: var(--mtm-success); background: var(--mtm-success-bg); color: var(--mtm-text-dark); }
    .account-dialog__box--warning { border-color: var(--mtm-warning); background: var(--mtm-warning-bg); color: var(--mtm-text-dark); }
    .account-dialog__box--error { border-color: var(--mtm-error); background: var(--mtm-error-bg); color: var(--mtm-error); }
    .account-dialog__box dl { display: grid; gap: 6px; margin: 4px 0 0; }
    .account-dialog__box dt { color: var(--mtm-text-muted); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .account-dialog__box dd { margin: 0; font-weight: 600; }
    .is-break { overflow-wrap: anywhere; }
    code { padding: 1px 6px; border-radius: 4px; background: var(--mtm-card-bg); font-size: 0.9em; }
  `,
})
export class ClientAccountDialog {
  private readonly dialogRef = inject(MatDialogRef<ClientAccountDialog>);
  private readonly api = inject(VentesApiService);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ClientAccountDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    password: [this.generatePassword(), [Validators.required, passwordPolicyValidator()]],
  });
  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  protected creating = false;
  protected created = false;
  protected createdPassword = '';
  protected invitationSent = false;
  protected resetToken: string | null = null;
  protected error: string | null = null;

  protected regeneratePassword(): void {
    this.form.controls.password.setValue(this.generatePassword());
  }

  protected create(): void {
    if (this.form.invalid || this.creating) return;
    this.creating = true;
    this.error = null;
    const password = this.form.controls.password.value;
    this.api.createClientAccount(this.data.prospectId, password).subscribe({
      next: (result) => {
        this.createdPassword = password;
        this.invitationSent = result.invitationSent;
        this.resetToken = result.resetToken ?? null;
        this.created = true;
        this.creating = false;
      },
      error: (error: { error?: { message?: string | string[] }; message?: string }) => {
        const message = error.error?.message ?? error.message;
        this.error = Array.isArray(message) ? message.join(', ') : message ?? 'Impossible de créer le compte client';
        this.creating = false;
      },
    });
  }

  protected close(): void {
    this.dialogRef.close(this.created);
  }

  /** Lien de première connexion à transmettre au client si l'e-mail n'est pas parti. */
  protected get invitationLink(): string | null {
    return this.resetToken
      ? `${environment.publicWebUrl}/espace-client/connexion?reset=${this.resetToken}`
      : null;
  }

  protected async copyCredentials(): Promise<void> {
    const lines = [`Email : ${this.data.email}`];
    if (this.invitationLink) lines.push(`Lien de première connexion (7 jours) : ${this.invitationLink}`);
    lines.push(`Mot de passe temporaire : ${this.createdPassword}`);
    await navigator.clipboard?.writeText(lines.join('\n'));
  }

  private generatePassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const randomPart = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    return `Mtm!${randomPart}9`;
  }
}
