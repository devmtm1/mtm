import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import type { Observable } from 'rxjs';
import { FinancesApiService } from '../../core/services/api/finances-api.service';
import { NotificationService } from '../../shared/services/notification.service';
import { downloadBlob } from '../../shared/utils/download';

export interface ExportDialogData {
  du: string;
  au: string;
}

/**
 * Export du journal pour l'exploitation comptable externe. Le motif est
 * obligatoire et consigné dans le journal d'audit avec la période et le
 * nombre de mouvements : le journal contient les tiers et les montants.
 */
@Component({
  selector: 'app-export-finances-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>Exporter le journal</h2>
    <mat-dialog-content class="export" [formGroup]="form">
      <p class="export__periode">Du {{ date(data.du) }} au {{ date(data.au) }}</p>
      <mat-radio-group formControlName="format" aria-label="Format du fichier" class="export__formats">
        <mat-radio-button value="xlsx">
          <strong>Classeur Excel</strong>
          <small>Journal, synthèse par activité, par mois et sommes dues</small>
        </mat-radio-button>
        <mat-radio-button value="csv">
          <strong>Fichier CSV</strong>
          <small>Le journal seul, pour un logiciel comptable ou Excel</small>
        </mat-radio-button>
      </mat-radio-group>
      <mat-form-field appearance="outline">
        <mat-label>Motif de l’export</mat-label>
        <textarea matInput rows="2" formControlName="justification" placeholder="Ex. Envoi au cabinet comptable, clôture de septembre"></textarea>
        <mat-hint>Consigné dans l’historique des actions avec votre identifiant.</mat-hint>
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
    .export__periode {
      margin: 0;
      font-size: 0.9rem;
      color: var(--mtm-text-muted);
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
export class ExportFinancesDialog {
  protected readonly data = inject<ExportDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ExportFinancesDialog, boolean>>(MatDialogRef);
  private readonly api = inject(FinancesApiService);
  private readonly notify = inject(NotificationService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly enCours = signal(false);
  protected readonly form = this.fb.group({
    format: ['xlsx' as 'xlsx' | 'csv'],
    justification: ['', [Validators.required, Validators.minLength(3)]],
  });

  protected date(valeur: string): string {
    return new Date(valeur).toLocaleDateString('fr-FR');
  }

  protected exporter(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { format, justification } = this.form.getRawValue();
    this.enCours.set(true);
    this.api.exporter({ du: this.data.du, au: this.data.au, format, justification: justification.trim() }).subscribe({
      next: (blob) => {
        downloadBlob(blob, `journal-financier_${this.data.du}_${this.data.au}.${format}`);
        this.notify.success('Export téléchargé');
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.enCours.set(false);
        this.notify.error(error, 'Export impossible');
      },
    });
  }

  static open(dialog: MatDialog, data: ExportDialogData): Observable<boolean | undefined> {
    return dialog.open(ExportFinancesDialog, { width: '500px', data }).afterClosed();
  }
}
