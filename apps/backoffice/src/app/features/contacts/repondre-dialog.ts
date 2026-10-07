import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import type { ContactMessage } from '../../core/services/api/contact-api.service';

export interface RepondreDialogData {
  contact: ContactMessage;
}

/**
 * Réponse à un message du site public. Le texte part par e-mail au demandeur et
 * s'affiche dans son espace client (écran « Demandes ») ; le message passe à
 * « lu ». Si une réponse existe déjà, elle est proposée pour être corrigée : le
 * client est alors prévenu de la nouvelle version.
 */
@Component({
  selector: 'app-repondre-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Répondre à {{ data.contact.nom }}</h2>
    <mat-dialog-content>
      <blockquote class="repondre-original">
        @if (data.contact.sujet) {
          <strong>{{ data.contact.sujet }}</strong>
        }
        <p>{{ data.contact.message }}</p>
      </blockquote>
      <mat-form-field appearance="outline" class="repondre-champ">
        <mat-label>Votre réponse</mat-label>
        <textarea matInput rows="6" maxlength="4000" [formControl]="reponse" placeholder="Bonjour, …"></textarea>
        <mat-hint>
          Envoyée à {{ data.contact.email ?? 'l’adresse du demandeur' }} et visible dans son espace client.
        </mat-hint>
        @if (reponse.invalid && reponse.touched) {
          <mat-error>Écrivez au moins quelques mots.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="envoyer()" [disabled]="reponse.invalid">
        {{ data.contact.reponse ? 'Envoyer la nouvelle réponse' : 'Envoyer la réponse' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .repondre-original { margin: 0 0 16px; padding: 10px 14px; border-left: 3px solid var(--mtm-border, #d1d5db); background: var(--mtm-bg, #f5f7fa); border-radius: 0 8px 8px 0; font-size: 0.88rem; }
    .repondre-original p { margin: 4px 0 0; white-space: pre-line; color: var(--mtm-text-muted, #6b7280); }
    .repondre-champ { width: 100%; min-width: min(520px, calc(100vw - 96px)); }
  `,
})
export class RepondreDialog {
  private readonly dialogRef = inject(MatDialogRef<RepondreDialog, string>);
  protected readonly data = inject<RepondreDialogData>(MAT_DIALOG_DATA);

  protected readonly reponse = new FormControl(this.data.contact.reponse ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2), Validators.maxLength(4000)],
  });

  protected envoyer(): void {
    if (this.reponse.invalid || this.reponse.value.trim().length < 2) {
      this.reponse.markAsTouched();
      return;
    }
    this.dialogRef.close(this.reponse.value.trim());
  }

  static open(dialog: MatDialog, data: RepondreDialogData): Observable<string | undefined> {
    return dialog.open(RepondreDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
