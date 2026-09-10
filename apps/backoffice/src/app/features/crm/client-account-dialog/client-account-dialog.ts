import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';

export interface ClientAccountDialogData {
  prospectId: string;
  email: string;
  name: string;
}

@Component({
  selector: 'app-client-account-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './client-account-dialog.html',
})
export class ClientAccountDialog {
  private readonly dialogRef = inject(MatDialogRef<ClientAccountDialog>);
  private readonly api = inject(VentesApiService);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ClientAccountDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    password: [this.generatePassword(), [Validators.required, Validators.minLength(12), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]],
  });
  protected creating = false;
  protected created = false;
  protected createdPassword = '';
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
      next: () => {
        this.createdPassword = password;
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

  protected async copyCredentials(): Promise<void> {
    await navigator.clipboard?.writeText(`Email : ${this.data.email}\nMot de passe : ${this.createdPassword}`);
  }

  private generatePassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const randomPart = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    return `Mtm!${randomPart}9`;
  }
}
