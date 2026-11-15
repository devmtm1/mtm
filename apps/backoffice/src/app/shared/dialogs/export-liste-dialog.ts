import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import type { Observable } from 'rxjs';
import { ExportsApiService, type FormatExport, type SourceExport } from '../../core/services/api/exports-api.service';
import { NotificationService } from '../services/notification.service';
import { downloadBlob } from '../utils/download';

/** Au-delà, l'API refuse : mieux vaut le dire avant d'envoyer. */
export const LIGNES_EXPORT_MAX = 5000;

/**
 * Export d'une liste du back-office en Excel ou en PDF, avec les filtres et le tri de l'écran. Le motif est obligatoire
 * et consigné dans le journal d'audit avec le nombre de lignes : une liste contient des tiers et des montants.
 */
@Component({
  selector: 'app-export-liste-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Exporter « {{ data.titre }} »</h2>
    <mat-dialog-content class="export" [formGroup]="form">
      <p class="export__resume">
        {{ data.lignes.length }} ligne{{ data.lignes.length > 1 ? 's' : '' }} · {{ data.colonnes.length }} colonne{{ data.colonnes.length > 1 ? 's' : '' }},
        telles qu’affichées à l’écran avec vos filtres.
      </p>
      @if (trop()) {
        <p class="export__alerte" role="alert">
          La liste dépasse {{ max }} lignes : affinez vos filtres pour l’exporter.
        </p>
      }
      <mat-radio-group formControlName="format" aria-label="Format du fichier" class="export__formats">
        <mat-radio-button value="xlsx">
          <strong>Classeur Excel</strong>
          <small>Pour trier, calculer et retravailler les chiffres</small>
        </mat-radio-button>
        <mat-radio-button value="pdf">
          <strong>Document PDF</strong>
          <small>Mis en page à l’en-tête de MTM, prêt à imprimer ou à envoyer</small>
        </mat-radio-button>
      </mat-radio-group>
      <mat-form-field appearance="outline">
        <mat-label>Motif de l’export</mat-label>
        <textarea matInput rows="2" formControlName="justification" placeholder="Ex. Point hebdomadaire avec la direction"></textarea>
        <mat-hint>Consigné dans l’historique des actions avec votre identifiant.</mat-hint>
        @if (form.controls.justification.touched && form.controls.justification.invalid) {
          <mat-error>Trois caractères minimum.</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="exporter()" [disabled]="enCours() || trop() || !data.lignes.length">
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
    .export__resume {
      margin: 0;
      font-size: 0.9rem;
      color: var(--mtm-text-muted);
    }
    .export__alerte {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--mtm-error, #b42318);
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
export class ExportListeDialog {
  protected readonly data = inject<SourceExport>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ExportListeDialog, boolean>>(MatDialogRef);
  private readonly api = inject(ExportsApiService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly max = LIGNES_EXPORT_MAX;
  protected readonly enCours = signal(false);
  protected readonly trop = signal(this.data.lignes.length > LIGNES_EXPORT_MAX);
  protected readonly form = this.fb.group({
    format: ['xlsx' as FormatExport],
    justification: ['', [Validators.required, Validators.minLength(3)]],
  });

  protected exporter(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { format, justification } = this.form.getRawValue();
    this.enCours.set(true);
    this.api.exporterTableau(this.data, format, justification.trim()).subscribe({
      next: (blob) => {
        downloadBlob(blob, `${nomFichierListe(this.data.titre)}_${new Date().toISOString().slice(0, 10)}.${format}`);
        this.notify.success('Export téléchargé');
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        this.notify.error(error, 'Export impossible');
      },
    });
  }

  /** Ouvre le dialogue d'export de la liste. */
  static open(dialog: MatDialog, source: SourceExport): Observable<boolean | undefined> {
    return dialog.open<ExportListeDialog, SourceExport, boolean>(ExportListeDialog, { width: '500px', data: source }).afterClosed();
  }
}

/** Nom de fichier sûr : lettres, chiffres et tirets, sans accent. */
export function nomFichierListe(titre: string): string {
  return (
    titre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'export'
  );
}
