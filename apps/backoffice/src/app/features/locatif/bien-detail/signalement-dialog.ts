import { Component, inject } from '@angular/core';
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
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import type { CreateIncidentPayload, LocatifOptions } from '../../../core/models/locatif.model';
import {
  NATURES_SIGNALEMENT,
  TYPES_DEMANDE,
  TYPES_INCIDENT,
  simpleLabel,
} from '../locatif-status';

export interface SignalementDialogData {
  options: Partial<LocatifOptions>;
}

/**
 * Incident constaté par MTM ou demande reçue du locataire (sections 4 et 15) :
 * le back-office doit pouvoir les saisir, pas seulement les clore.
 */
@Component({
  selector: 'app-signalement-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Nouveau signalement</h2>
    <mat-dialog-content [formGroup]="form" class="signalement-dialog-grid">
      <mat-form-field appearance="outline">
        <mat-label>Nature</mat-label>
        <mat-select formControlName="nature">
          @for (nature of natures; track nature) {
            <mat-option [value]="nature">{{ natureLabel(nature) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Type</mat-label>
        <mat-select formControlName="type">
          @for (type of typesDisponibles(); track type) {
            <mat-option [value]="type">{{ typeLabel(type) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Description</mat-label>
        <textarea matInput rows="3" formControlName="description"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .signalement-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 420px; }
    .wide { grid-column: 1 / -1; }
  `,
})
export class SignalementDialog {
  private readonly dialogRef = inject(MatDialogRef<SignalementDialog, CreateIncidentPayload>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<SignalementDialogData>(MAT_DIALOG_DATA);
  protected readonly natures = ['incident', 'demande'];

  protected readonly form = this.formBuilder.nonNullable.group({
    nature: ['incident', Validators.required],
    type: ['', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  protected typesDisponibles(): string[] {
    if (this.form.controls.nature.value === 'demande') {
      return (
        this.data.options.typesDemande ?? [
          'renouvellement_bail',
          'attestation',
          'travaux',
          'depart',
          'autre',
        ]
      );
    }
    return (
      this.data.options.typesIncident ?? ['plomberie', 'electricite', 'serrurerie', 'autre']
    );
  }

  protected natureLabel(nature: string): string {
    return simpleLabel(NATURES_SIGNALEMENT, nature);
  }

  protected typeLabel(type: string): string {
    return this.form.controls.nature.value === 'demande'
      ? simpleLabel(TYPES_DEMANDE, type)
      : simpleLabel(TYPES_INCIDENT, type);
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    this.dialogRef.close({
      nature: valeur.nature,
      type: valeur.type,
      description: valeur.description.trim(),
    });
  }

  static open(
    dialog: MatDialog,
    data: SignalementDialogData,
  ): Observable<CreateIncidentPayload | undefined> {
    return dialog.open(SignalementDialog, { width: '460px', data }).afterClosed();
  }
}
