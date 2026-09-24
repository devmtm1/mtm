import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import type { PreavisPayload } from '../../../core/models/locatif.model';

/** Préavis de départ donné par le locataire (section 15). */
@Component({
  selector: 'app-preavis-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Préavis de départ</h2>
    <mat-dialog-content [formGroup]="form" class="preavis-dialog-grid">
      <mat-form-field appearance="outline">
        <mat-label>Préavis donné le</mat-label>
        <input matInput type="date" formControlName="preavisDonneLe" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Départ prévu le</mat-label>
        <input matInput type="date" formControlName="preavisDepartPrevu" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Enregistrer le préavis
      </button>
    </mat-dialog-actions>
  `,
  styles: `.preavis-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 380px; }`,
})
export class PreavisDialog {
  private readonly dialogRef = inject(MatDialogRef<PreavisDialog, PreavisPayload>);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    preavisDonneLe: [new Date().toISOString().slice(0, 10), Validators.required],
    preavisDepartPrevu: ['', Validators.required],
  });

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  static open(dialog: MatDialog): Observable<PreavisPayload | undefined> {
    return dialog.open(PreavisDialog, { width: '400px' }).afterClosed();
  }
}
