import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface VentePaiementDialogData {
  dossierLabel: string;
}

@Component({
  selector: 'app-vente-paiement-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Enregistrer un paiement</h2>

    <mat-dialog-content>
      <p class="mb-3 text-sm text-gray-600">
        Dossier concerné : <strong>{{ data.dossierLabel }}</strong>
      </p>

      <form [formGroup]="form" class="grid gap-2">
        <mat-form-field appearance="outline">
          <mat-label>Montant du paiement (FCFA)</mat-label>
          <input matInput type="number" min="1" formControlName="montant" />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
})
export class VentePaiementDialog {
  private readonly dialogRef = inject(MatDialogRef<VentePaiementDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<VentePaiementDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    montant: [500000, [Validators.required, Validators.min(1)]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }
}
