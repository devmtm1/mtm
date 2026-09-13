import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LabelPipe } from '../../shared/pipes/label.pipe';

export interface VenteDocumentDialogData {
  dossierLabel: string;
  /** `generate` : PDF produit par l'API ; `upload` : fichier déposé par l'utilisateur. */
  mode: 'generate' | 'upload';
  types: string[];
  canPublish: boolean;
}

export interface VenteDocumentDialogResult {
  type: string;
  title?: string;
  isPublic: boolean;
  file?: File;
}

const MAX_FILE_SIZE = 15 * 1024 * 1024;

/**
 * Documents d'un dossier de vente (J1.6, section 17 CDC) : génération d'un
 * bon de réservation, reçu, facture, contrat ou état de paiement, ou dépôt
 * d'un fichier (contrat signé, justificatif). « Visible par le client »
 * publie le document dans l'espace client — réservé à la permission
 * ventes:publier.
 */
@Component({
  selector: 'app-vente-document-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, LabelPipe],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'generate' ? 'Générer un document' : 'Ajouter un document' }}</h2>
    <mat-dialog-content>
      <p class="dialog-context">Dossier {{ data.dossierLabel }}</p>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Type de document</mat-label>
          <mat-select formControlName="type">
            @for (type of data.types; track type) {
              <mat-option [value]="type">{{ type | mtmLabel }}</mat-option>
            }
          </mat-select>
          @if (data.mode === 'generate') {
            <mat-hint>Le PDF est produit à partir des informations du dossier (prix, paiements, réservation).</mat-hint>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Titre (facultatif)</mat-label>
          <input matInput formControlName="title" maxlength="120" placeholder="Ex. Contrat signé le 12/09/2026" />
        </mat-form-field>
        @if (data.mode === 'upload') {
          <label class="file-field">
            <span class="file-field__label">Fichier (PDF, image ou bureautique, 15 Mo max.)</span>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" (change)="onFile($event)" />
            @if (fileName()) {
              <span class="file-field__name">{{ fileName() }}</span>
            }
            @if (fileError()) {
              <span class="file-field__error">{{ fileError() }}</span>
            }
          </label>
        }
        @if (data.canPublish) {
          <mat-checkbox formControlName="isPublic">Visible par le client dans son espace</mat-checkbox>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="!isValid()">
        {{ data.mode === 'generate' ? 'Générer le PDF' : 'Ajouter' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-context { margin: 0 0 12px; color: var(--mtm-text-muted); font-size: 0.86rem; }
    .dialog-form { display: grid; gap: 4px; min-width: min(460px, calc(100vw - 96px)); }
    .file-field { display: grid; gap: 6px; padding: 12px; border: 1px dashed var(--mtm-border); border-radius: 8px; background: var(--mtm-bg-surface); cursor: pointer; }
    .file-field__label { font-size: 0.8rem; font-weight: 600; color: var(--mtm-text-dark); }
    .file-field__name { font-size: 0.8rem; color: var(--mtm-primary); }
    .file-field__error { font-size: 0.78rem; color: var(--mtm-error); }
  `,
})
export class VenteDocumentDialog {
  private readonly dialogRef = inject(MatDialogRef<VenteDocumentDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<VenteDocumentDialogData>(MAT_DIALOG_DATA);

  protected readonly fileName = signal('');
  protected readonly fileError = signal('');
  private file: File | null = null;

  protected readonly form = this.formBuilder.nonNullable.group({
    type: [this.data.types[0] ?? '', [Validators.required]],
    title: [''],
    isPublic: [false],
  });

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fileError.set('');
    if (file && file.size > MAX_FILE_SIZE) {
      this.fileError.set('Le fichier dépasse 15 Mo.');
      this.file = null;
      this.fileName.set('');
      return;
    }
    this.file = file;
    this.fileName.set(file?.name ?? '');
  }

  protected isValid(): boolean {
    return this.form.valid && (this.data.mode === 'generate' || this.file !== null);
  }

  protected submit(): void {
    if (!this.isValid()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const result: VenteDocumentDialogResult = {
      type: raw.type,
      isPublic: this.data.canPublish && raw.isPublic,
      ...(raw.title.trim() ? { title: raw.title.trim() } : {}),
      ...(this.file ? { file: this.file } : {}),
    };
    this.dialogRef.close(result);
  }
}
