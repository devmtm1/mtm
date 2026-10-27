import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { ProprietaireSummary } from '../../core/models/terrain.model';
import { SessionService } from '../../core/services/session.service';

interface ProprietaireForm {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  notes: FormControl<string>;
}

@Component({
  selector: 'app-proprietaire-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './proprietaire-dialog.html',
  styleUrl: './proprietaire-dialog.scss',
})
export class ProprietaireDialog {
  private readonly dialogRef = inject(MatDialogRef<ProprietaireDialog>);
  protected readonly dialogData = inject<{
    proprietaire?: ProprietaireSummary;
    /** Valeurs de départ d'un nouveau propriétaire (ex. une demande reçue du site). */
    prefill?: { firstName: string; lastName: string; email: string; phone: string };
  } | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly isEdit = !!this.dialogData?.proprietaire;
  /**
   * Les coordonnées sont réservées à l'administrateur : un autre peut les saisir à la création
   * (sans pouvoir les relire), mais pas les modifier ensuite.
   */
  protected readonly voitCoordonnees = inject(SessionService).hasRole('administrateur');
  protected readonly coordonneesEditables = this.voitCoordonnees || !this.isEdit;

  protected readonly form = new FormGroup<ProprietaireForm>({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  constructor() {
    const proprietaire = this.dialogData?.proprietaire;
    if (!proprietaire && this.dialogData?.prefill) this.form.patchValue(this.dialogData.prefill);
    if (proprietaire) {
      this.form.patchValue({
        firstName: proprietaire.firstName,
        lastName: proprietaire.lastName,
        email: proprietaire.email ?? '',
        phone: proprietaire.phone ?? '',
        notes: proprietaire.notes ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const optional = (item: string) => (item.trim() ? item.trim() : null);
    const payload: Omit<ProprietaireSummary, 'id'> = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: optional(value.email),
      phone: optional(value.phone),
      notes: optional(value.notes),
    };
    this.dialogRef.close(payload);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
