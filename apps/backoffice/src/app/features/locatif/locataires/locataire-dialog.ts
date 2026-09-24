import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { Locataire } from '../../../core/models/locatif.model';
import { NotificationService } from '../../../shared/services/notification.service';

export interface LocataireDialogData {
  locataire?: Locataire;
}

/** Création ou modification d'une fiche locataire (J2.1). */
@Component({
  selector: 'app-locataire-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Modifier le locataire' : 'Nouveau locataire' }}</h2>
    <mat-dialog-content [formGroup]="form" class="locataire-dialog-grid">
      <mat-form-field appearance="outline">
        <mat-label>Prénom</mat-label>
        <input matInput formControlName="firstName" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Nom</mat-label>
        <input matInput formControlName="lastName" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Téléphone</mat-label>
        <input matInput formControlName="phone" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>E-mail</mat-label>
        <input matInput type="email" formControlName="email" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Notes internes</mat-label>
        <textarea matInput rows="2" formControlName="notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="saving()">
        {{ saving() ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `.locataire-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 400px; } .wide { grid-column: 1 / -1; }`,
})
export class LocataireDialog {
  private readonly dialogRef = inject(MatDialogRef<LocataireDialog, Locataire>);
  private readonly api = inject(LocatifApiService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<LocataireDialogData>(MAT_DIALOG_DATA);

  protected readonly isEdit = !!this.data.locataire;
  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    email: [''],
    notes: [''],
  });

  constructor() {
    const locataire = this.data.locataire;
    if (locataire) {
      this.form.patchValue({
        firstName: locataire.firstName,
        lastName: locataire.lastName,
        phone: locataire.phone ?? '',
        email: locataire.email ?? '',
        notes: locataire.notes ?? '',
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    const payload = {
      firstName: valeur.firstName.trim(),
      lastName: valeur.lastName.trim(),
      phone: texte(valeur.phone),
      email: texte(valeur.email),
      notes: texte(valeur.notes),
    };
    this.saving.set(true);
    const request = this.isEdit
      ? this.api.updateLocataire(this.data.locataire!.id, payload)
      : this.api.createLocataire(payload);
    request.subscribe({
      next: (locataire) => {
        this.saving.set(false);
        this.dialogRef.close(locataire);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, this.isEdit ? 'Mise à jour impossible' : 'Création impossible');
      },
    });
  }

  static open(dialog: MatDialog, data: LocataireDialogData = {}): Observable<Locataire | undefined> {
    return dialog.open(LocataireDialog, { width: '480px', data }).afterClosed();
  }
}
