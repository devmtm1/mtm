import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideFileText, LucideUpload } from '@lucide/angular';
import { businessLabel } from '../../../shared/pipes/label.pipe';

export interface MandatDocumentDialogData {
  documentTypes: string[];
}

export interface MandatDocumentDialogResult {
  file: File;
  type: string;
  title: string;
}

const TYPE_HELP: Record<string, string> = {
  contrat: 'Le mandat signé par le propriétaire et MTM.',
  avenant: 'Modification du contrat (durée, prix, lots…).',
  preuve_signature: 'Photo, scan ou accusé prouvant la signature.',
  correspondance: 'Courrier ou e-mail échangé avec le propriétaire.',
  justificatif: 'Pièce d’identité, titre, procuration…',
  autre: 'Tout autre document lié au mandat.',
};

/**
 * Ajout d'un document au mandat : le type est demandé avant l'envoi, pour
 * que la GED reste classée (« contrat » ≠ « correspondance »).
 */
@Component({
  selector: 'app-mandat-document-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, LucideFileText, LucideUpload],
  template: `
    <h2 mat-dialog-title>Ajouter un document</h2>
    <mat-dialog-content class="doc-dialog">
      <p class="doc-dialog__intro">Les documents du mandat restent internes à MTM ; ils ne sont jamais publiés sur le site.</p>
      <label class="doc-dialog__drop" [class.has-file]="file()">
        @if (file(); as selected) {
          <svg lucideFileText aria-hidden="true"></svg>
          <strong>{{ selected.name }}</strong>
          <small>{{ (selected.size / 1024 / 1024).toFixed(2) }} Mo · cliquer pour changer</small>
        } @else {
          <svg lucideUpload aria-hidden="true"></svg>
          <strong>Choisir un fichier</strong>
          <small>PDF, image ou Word</small>
        }
        <input type="file" accept="application/pdf,image/*,.doc,.docx" (change)="select($event)" />
      </label>
      <form [formGroup]="form" class="doc-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Type de document</mat-label>
          <mat-select formControlName="type">
            @for (type of data.documentTypes; track type) {
              <mat-option [value]="type">{{ label(type) }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ help(form.controls.type.value) }}</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Titre</mat-label>
          <input matInput formControlName="title" placeholder="Ex. Mandat de vente signé le 12/09/2026" />
          <mat-hint>Tel qu’il apparaîtra dans la liste.</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="!file() || form.invalid">Ajouter</button>
    </mat-dialog-actions>
  `,
  styles: `
    .doc-dialog { display: grid; gap: 14px; min-width: min(440px, calc(100vw - 96px)); }
    .doc-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; }
    .doc-dialog__drop {
      display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 18px;
      border: 1px dashed var(--mtm-primary); border-radius: 10px; background: var(--mtm-primary-subtle);
      color: var(--mtm-primary); text-align: center; cursor: pointer;
    }
    .doc-dialog__drop.has-file { border-style: solid; }
    .doc-dialog__drop svg { width: 22px; height: 22px; }
    .doc-dialog__drop small { color: var(--mtm-text-muted); font-size: 0.76rem; }
    .doc-dialog__drop input { display: none; }
    .doc-dialog__form { display: grid; gap: 6px; }
  `,
})
export class MandatDocumentDialog {
  private readonly dialogRef = inject(MatDialogRef<MandatDocumentDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<MandatDocumentDialogData>(MAT_DIALOG_DATA);

  protected readonly file = signal<File | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    type: [this.data.documentTypes[0] ?? 'contrat', Validators.required],
    title: ['', [Validators.required, Validators.maxLength(200)]],
  });

  protected select(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.file.set(file);
    if (file && !this.form.controls.title.value) this.form.controls.title.setValue(file.name.replace(/\.[^.]+$/, ''));
    input.value = '';
  }

  protected label(type: string): string {
    return businessLabel(type);
  }

  protected help(type: string): string {
    return TYPE_HELP[type] ?? '';
  }

  protected confirm(): void {
    const file = this.file();
    if (!file || this.form.invalid) return;
    const { type, title } = this.form.getRawValue();
    const result: MandatDocumentDialogResult = { file, type, title: title.trim() };
    this.dialogRef.close(result);
  }
}
