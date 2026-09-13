import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';

export interface JustificationDialogData {
  title: string;
  /** Explique à l'utilisateur pourquoi une justification est demandée. */
  description: string;
  confirmLabel?: string;
}

/**
 * Saisie d'une justification avant une action sensible (export de données,
 * section 24 CDC). L'API l'exige et la consigne dans le journal d'audit ;
 * ce dialogue remplace un `prompt()` natif, non stylé et non accessible.
 */
@Component({
  selector: 'app-justification-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="mb-3 text-sm text-gray-600">{{ data.description }}</p>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Justification</mat-label>
        <textarea matInput rows="3" [formControl]="justification" placeholder="Ex. Reporting mensuel direction"></textarea>
        <mat-hint>Consignée dans le journal d’audit avec votre identifiant.</mat-hint>
        @if (justification.invalid && justification.touched) {
          <mat-error>Trois caractères minimum.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="justification.invalid">
        {{ data.confirmLabel ?? 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class JustificationDialog {
  private readonly dialogRef = inject(MatDialogRef<JustificationDialog>);
  readonly data = inject<JustificationDialogData>(MAT_DIALOG_DATA);

  protected readonly justification = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  protected confirm(): void {
    if (this.justification.invalid) {
      this.justification.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.justification.value.trim());
  }

  /** Ouvre le dialogue ; émet la justification saisie, ou `undefined` si annulé. */
  static ask(dialog: MatDialog, data: JustificationDialogData): Observable<string | undefined> {
    return dialog.open<JustificationDialog, JustificationDialogData, string>(JustificationDialog, { width: '480px', data }).afterClosed();
  }
}
