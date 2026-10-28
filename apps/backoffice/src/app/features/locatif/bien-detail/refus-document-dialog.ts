import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';

/** Refus d'un justificatif déposé par le locataire : le motif est obligatoire, car le locataire le lira. */
@Component({
  selector: 'app-refus-document-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Refuser l’attestation</h2>
    <mat-dialog-content [formGroup]="form">
      <p class="refus-dialog-hint">Le locataire lira ce motif dans son espace et pourra déposer une nouvelle pièce.</p>
      <mat-form-field appearance="outline" class="refus-dialog-field">
        <mat-label>Motif du refus</mat-label>
        <textarea matInput rows="3" maxlength="500" formControlName="motif" placeholder="Ex. document illisible, nom différent du bail…"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="warn" type="button" (click)="confirm()" [disabled]="form.invalid">Refuser</button>
    </mat-dialog-actions>
  `,
  styles: `
    .refus-dialog-field { width: 100%; min-width: 340px; }
    .refus-dialog-hint { margin: 0 0 8px; color: var(--mtm-text-muted, #5f6673); font-size: 0.875rem; }
  `,
})
export class RefusDocumentDialog {
  private readonly dialogRef = inject(MatDialogRef<RefusDocumentDialog, string>);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    motif: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected confirm(): void {
    const motif = this.form.getRawValue().motif.trim();
    if (!motif) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(motif);
  }

  static open(dialog: MatDialog): Observable<string | undefined> {
    return dialog.open(RefusDocumentDialog, { width: '420px' }).afterClosed();
  }
}
