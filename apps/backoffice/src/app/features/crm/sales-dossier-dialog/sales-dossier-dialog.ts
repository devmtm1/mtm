import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VentesApiService } from '../../../core/services/api/ventes-api.service';

export interface SalesDossierDialogData {
  prospectId: string;
  prospectName: string;
}

@Component({
  selector: 'app-sales-dossier-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './sales-dossier-dialog.html',
})
export class SalesDossierDialog {
  private readonly dialogRef = inject(MatDialogRef<SalesDossierDialog>);
  private readonly api = inject(VentesApiService);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<SalesDossierDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    prixVente: ['', [Validators.pattern(/^\d+(\.\d+)?$/)]],
    notes: [''],
  });
  protected creating = false;
  protected error: string | null = null;

  protected submit(): void {
    if (this.form.invalid || this.creating) return;
    this.creating = true;
    this.error = null;
    const raw = this.form.getRawValue();
    const prixVente = raw.prixVente ? Number(raw.prixVente) : undefined;
    this.api.createDossier({
      prospectId: this.data.prospectId,
      ...(prixVente !== undefined ? { prixVente } : {}),
      ...(raw.notes.trim() ? { notes: raw.notes.trim() } : {}),
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error: { error?: { message?: string | string[] }; message?: string }) => {
        const message = error.error?.message ?? error.message;
        this.error = Array.isArray(message) ? message.join(', ') : message ?? 'Impossible de créer le dossier de vente';
        this.creating = false;
      },
    });
  }
}
