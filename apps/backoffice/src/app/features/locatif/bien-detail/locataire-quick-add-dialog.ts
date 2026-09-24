import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import { LocatifApiService } from '../../../core/services/api/locatif-api.service';
import type { Locataire } from '../../../core/models/locatif.model';
import { NotificationService } from '../../../shared/services/notification.service';

/** Création rapide d'une fiche locataire, sans quitter la création du bail. */
@Component({
  selector: 'app-locataire-quick-add-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Nouveau locataire</h2>
    <mat-dialog-content [formGroup]="form" class="quick-add-grid">
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="saving()">
        {{ saving() ? 'Création…' : 'Créer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `.quick-add-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 360px; }`,
})
export class LocataireQuickAddDialog {
  private readonly dialogRef = inject(MatDialogRef<LocataireQuickAddDialog>);
  private readonly api = inject(LocatifApiService);
  private readonly notify = inject(NotificationService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly saving = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    email: [''],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.saving.set(true);
    this.api
      .createLocataire({
        firstName: valeur.firstName.trim(),
        lastName: valeur.lastName.trim(),
        phone: texte(valeur.phone),
        email: texte(valeur.email),
      })
      .subscribe({
        next: (locataire) => {
          this.saving.set(false);
          this.dialogRef.close(locataire);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.notify.error(error, 'Création impossible');
        },
      });
  }

  static open(dialog: MatDialog): Observable<Locataire | undefined> {
    return dialog.open(LocataireQuickAddDialog, { width: '440px' }).afterClosed();
  }
}
