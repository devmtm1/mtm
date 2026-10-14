import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LucideUpload } from '@lucide/angular';
import type { Observable } from 'rxjs';
import { TYPES_DOCUMENT, TYPES_FICHIER_ACCEPTES, label, problemeFichier, tailleLisible } from '../chantier-status';

export interface PieceDialogData {
  /** Types proposés (référentiel de l’API, sans le rapport qui se génère). */
  types: string[];
  /** Seule la permission de publier permet de montrer la pièce au client. */
  peutPublier: boolean;
}

export interface PieceDialogResult {
  file: File;
  type: string;
  title?: string;
  visibleClient: boolean;
}

/** Ajout d’une pièce au chantier : plan, permis, contrat, facture, photo… */
@Component({
  selector: 'app-piece-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LucideUpload,
  ],
  template: `
    <h2 mat-dialog-title>Ajouter une pièce</h2>
    <mat-dialog-content class="piece-dialog" [formGroup]="form">
      <label class="piece-dialog__upload">
        <svg lucideUpload aria-hidden="true"></svg>
        {{ fichier() ? 'Changer de fichier' : 'Choisir le fichier' }}
        <input type="file" [accept]="accept" (change)="choisir($event)" />
      </label>
      <p class="piece-dialog__fichier" [class.piece-dialog__fichier--erreur]="erreur()">
        @if (erreur()) {
          {{ erreur() }}
        } @else if (fichier(); as f) {
          {{ f.name }} · {{ taille(f.size) }}
        } @else {
          Photo, vidéo MP4, PDF ou Word — 10 Mo au maximum.
        }
      </p>

      <mat-form-field appearance="outline">
        <mat-label>Type de pièce</mat-label>
        <mat-select formControlName="type">
          @for (type of data.types; track type) {
            <mat-option [value]="type">{{ typeLabel(type) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Titre (facultatif)</mat-label>
        <input matInput formControlName="title" maxlength="160" autocomplete="off" />
      </mat-form-field>

      @if (data.peutPublier) {
        <mat-checkbox formControlName="visibleClient">Montrer cette pièce au client dans son espace</mat-checkbox>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="!fichier() || form.invalid">
        Ajouter
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .piece-dialog {
      display: grid;
      gap: 4px;
      min-width: 420px;
    }
    .piece-dialog__upload {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      justify-self: start;
      padding: 8px 14px;
      border: 1px solid var(--mtm-border);
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .piece-dialog__upload svg {
      width: 16px;
      height: 16px;
    }
    .piece-dialog__upload input {
      display: none;
    }
    .piece-dialog__fichier {
      margin: 0 0 10px;
      font-size: 0.82rem;
      color: var(--mtm-text-muted);
    }
    .piece-dialog__fichier--erreur {
      color: var(--mtm-error);
    }
    @media (max-width: 520px) {
      .piece-dialog {
        min-width: 0;
      }
    }
  `,
})
export class PieceDialog {
  protected readonly data = inject<PieceDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PieceDialog, PieceDialogResult>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly accept = TYPES_FICHIER_ACCEPTES;
  protected readonly fichier = signal<File | null>(null);
  protected readonly erreur = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    type: [this.data.types[0] ?? 'autre', Validators.required],
    title: [''],
    visibleClient: [false],
  });

  protected typeLabel(code: string): string {
    return label(TYPES_DOCUMENT, code);
  }

  protected taille(octets: number): string {
    return tailleLisible(octets);
  }

  protected choisir(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const probleme = problemeFichier(file);
    this.erreur.set(probleme);
    this.fichier.set(probleme ? null : file);
    // Une photo ou une vidéo se range d’elle-même parmi les photos.
    if (!probleme && /^(image|video)\//.test(file.type) && this.data.types.includes('photo_chantier')) {
      this.form.controls.type.setValue('photo_chantier');
    }
  }

  protected confirm(): void {
    const file = this.fichier();
    if (!file || this.form.invalid) return;
    const valeur = this.form.getRawValue();
    this.dialogRef.close({
      file,
      type: valeur.type,
      title: valeur.title.trim() || undefined,
      visibleClient: this.data.peutPublier && valeur.visibleClient,
    });
  }

  static open(dialog: MatDialog, data: PieceDialogData): Observable<PieceDialogResult | undefined> {
    return dialog.open(PieceDialog, { width: '480px', data }).afterClosed();
  }
}
