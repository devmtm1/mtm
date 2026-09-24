import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import { passwordPolicyValidator, PASSWORD_POLICY_HINT } from '../../core/validators/password-policy.validator';
import type { ClientAccountCreated } from '../../core/models/client-account.model';
import { environment } from '../../../environments/environment';

export interface ClientAccountDialogData {
  email: string;
  name: string;
  /** Description de ce que le client verra dans son espace (dossiers, bien, location…). */
  scopeDescription: string;
  /** Appel API réel : diffère selon qu'il s'agit d'un prospect, d'un propriétaire ou d'un locataire. */
  create: (password: string) => Observable<ClientAccountCreated>;
}

/**
 * Ouverture d'un accès espace client, quel que soit le type de personne
 * (prospect, propriétaire, locataire) : même geste, seul l'appel API change.
 */
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
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ClientAccountDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    password: [this.generatePassword(), [passwordPolicyValidator()]],
  });
  protected readonly passwordHint = PASSWORD_POLICY_HINT;
  // Signaux : l'application est sans zone.js, un champ modifié dans un
  // rappel HTTP ne rafraîchirait pas l'écran (le bouton restait sur
  // « Création… » alors que le compte était créé).
  protected readonly creating = signal(false);
  protected readonly created = signal(false);
  protected readonly createdPassword = signal('');
  protected readonly invitationSent = signal(false);
  protected readonly resetToken = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected regeneratePassword(): void {
    this.form.controls.password.setValue(this.generatePassword());
  }

  protected create(): void {
    if (this.form.invalid || this.creating()) return;
    this.creating.set(true);
    this.error.set(null);
    const password = this.form.controls.password.value;
    this.data.create(password).subscribe({
      next: (result) => {
        this.createdPassword.set(password);
        this.invitationSent.set(result.invitationSent);
        this.resetToken.set(result.resetToken ?? null);
        this.created.set(true);
        this.creating.set(false);
      },
      error: (error: { error?: { message?: string | string[] }; message?: string }) => {
        const message = error.error?.message ?? error.message;
        this.error.set(Array.isArray(message) ? message.join(', ') : (message ?? 'Impossible de créer le compte client'));
        this.creating.set(false);
      },
    });
  }

  protected close(): void {
    this.dialogRef.close(this.created());
  }

  /** Lien de première connexion à transmettre au client si l'e-mail n'est pas parti. */
  protected get invitationLink(): string | null {
    const token = this.resetToken();
    return token
      ? `${environment.publicWebUrl}/espace-client/connexion?reset=${token}`
      : null;
  }

  protected async copyCredentials(): Promise<void> {
    const lines = [`Email : ${this.data.email}`];
    if (this.invitationLink) lines.push(`Lien de première connexion (7 jours) : ${this.invitationLink}`);
    lines.push(`Mot de passe temporaire : ${this.createdPassword()}`);
    await navigator.clipboard?.writeText(lines.join('\n'));
  }

  private generatePassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const randomPart = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    return `Mtm!${randomPart}9`;
  }

  static open(dialog: MatDialog, data: ClientAccountDialogData): Observable<boolean | undefined> {
    return dialog
      .open(ClientAccountDialog, { width: '520px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed();
  }
}
