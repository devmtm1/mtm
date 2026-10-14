import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import type { Observable } from 'rxjs';
import { PilotageApiService } from '../../core/services/api/pilotage-api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { downloadBlob } from '../../shared/utils/download';
import { nomFichierRapport } from './rapports-utils';

export interface ExportRapportData {
  code: string;
  titre: string;
  du: string;
  au: string;
  region?: string;
  /** Rapport sans période (photo du jour) : le nom du fichier n'en porte pas. */
  parPeriode: boolean;
}

/**
 * Export d'un rapport en PDF (à lire ou à imprimer) ou en Excel (à trier et à
 * retravailler). Le motif est obligatoire et consigné dans le journal d'audit.
 */
@Component({
  selector: 'app-export-rapport-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Exporter « {{ data.titre }} »</h2>
    <mat-dialog-content class="export" [formGroup]="form">
      <mat-radio-group formControlName="format" aria-label="Format du fichier" class="export__formats">
        <mat-radio-button value="pdf">
          <strong>Document PDF</strong>
          <small>Mis en page avec le logo et les mentions légales de MTM, prêt à imprimer</small>
        </mat-radio-button>
        <mat-radio-button value="xlsx">
          <strong>Classeur Excel</strong>
          <small>Un onglet par tableau, avec de vrais nombres pour trier et totaliser</small>
        </mat-radio-button>
      </mat-radio-group>
      <mat-form-field appearance="outline">
        <mat-label>Motif de l’export</mat-label>
        <textarea matInput rows="2" formControlName="justification" placeholder="Ex. Comité de direction du lundi"></textarea>
        <mat-hint>Consigné dans le journal d’audit avec votre identifiant.</mat-hint>
        @if (form.controls.justification.touched && form.controls.justification.invalid) {
          <mat-error>Trois caractères minimum.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="exporter()" [disabled]="enCours()">
        {{ enCours() ? 'Préparation…' : 'Télécharger' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .export {
      display: grid;
      gap: 12px;
      min-width: 440px;
    }
    .export__formats {
      display: grid;
      gap: 8px;
    }
    .export__formats small {
      display: block;
      color: var(--mtm-text-muted);
    }
    @media (max-width: 520px) {
      .export {
        min-width: 0;
      }
    }
  `,
})
export class ExportRapportDialog {
  protected readonly data = inject<ExportRapportData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ExportRapportDialog, boolean>>(MatDialogRef);
  private readonly api = inject(PilotageApiService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly enCours = signal(false);
  protected readonly form = this.fb.group({
    format: ['pdf' as 'pdf' | 'xlsx'],
    justification: ['', [Validators.required, Validators.minLength(3)]],
  });

  protected exporter(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { format, justification } = this.form.getRawValue();
    this.enCours.set(true);
    this.api
      .exporter(this.data.code, {
        du: this.data.du,
        au: this.data.au,
        region: this.data.region || undefined,
        format,
        justification: justification.trim(),
      })
      .subscribe({
        next: (blob) => {
          downloadBlob(
            blob,
            nomFichierRapport(this.data.titre, this.data.parPeriode ? this.data.du : null, this.data.parPeriode ? this.data.au : null, format),
          );
          this.notify.success('Rapport téléchargé');
          this.dialogRef.close(true);
        },
        error: (error: unknown) => {
          this.enCours.set(false);
          this.notify.error(error, 'Export impossible');
        },
      });
  }

  static open(dialog: MatDialog, data: ExportRapportData): Observable<boolean | undefined> {
    return dialog.open(ExportRapportDialog, { width: '500px', data }).afterClosed();
  }
}
