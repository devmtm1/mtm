import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';

export type TypeChamp = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';

export interface Champ {
  cle: string;
  label: string;
  type?: TypeChamp;
  options?: { valeur: string; label: string }[];
  requis?: boolean;
  valeur?: string | number | boolean;
  aide?: string;
  min?: number;
  max?: number;
  minLength?: number;
  placeholder?: string;
}

export interface FormDialogData {
  titre: string;
  description?: string;
  champs: Champ[];
  confirmer?: string;
}

export type FormDialogResultat = Record<string, string | number | boolean>;

/**
 * Boîte de saisie à champs déclarés : remplace une dizaine de petits dialogues
 * (paiement d'un reversement, clôture de caisse, décision sur un écart…).
 * Les nombres reviennent en nombres, les champs vides facultatifs sont omis.
 */
@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.titre }}</h2>
    <mat-dialog-content [formGroup]="form" class="form-dialog">
      @if (data.description) {
        <p class="form-dialog__description">{{ data.description }}</p>
      }
      @for (champ of data.champs; track champ.cle) {
        @switch (champ.type ?? 'text') {
          @case ('checkbox') {
            <mat-checkbox [formControlName]="champ.cle">{{ champ.label }}</mat-checkbox>
            @if (champ.aide) {
              <small class="form-dialog__aide">{{ champ.aide }}</small>
            }
          }
          @case ('select') {
            <mat-form-field appearance="outline">
              <mat-label>{{ champ.label }}</mat-label>
              <mat-select [formControlName]="champ.cle">
                @if (!champ.requis) {
                  <mat-option value="">—</mat-option>
                }
                @for (option of champ.options ?? []; track option.valeur) {
                  <mat-option [value]="option.valeur">{{ option.label }}</mat-option>
                }
              </mat-select>
              @if (champ.aide) {
                <mat-hint>{{ champ.aide }}</mat-hint>
              }
              @if (form.controls[champ.cle].touched && form.controls[champ.cle].invalid) {
                <mat-error>Choisissez une valeur.</mat-error>
              }
            </mat-form-field>
          }
          @case ('textarea') {
            <mat-form-field appearance="outline">
              <mat-label>{{ champ.label }}</mat-label>
              <textarea matInput rows="3" [formControlName]="champ.cle" [placeholder]="champ.placeholder ?? ''"></textarea>
              @if (champ.aide) {
                <mat-hint>{{ champ.aide }}</mat-hint>
              }
              @if (form.controls[champ.cle].touched && form.controls[champ.cle].invalid) {
                <mat-error>{{ champ.minLength ? champ.minLength + ' caractères minimum.' : 'Champ obligatoire.' }}</mat-error>
              }
            </mat-form-field>
          }
          @default {
            <mat-form-field appearance="outline">
              <mat-label>{{ champ.label }}</mat-label>
              <input
                matInput
                [type]="champ.type ?? 'text'"
                [formControlName]="champ.cle"
                [attr.min]="champ.min ?? null"
                [attr.max]="champ.max ?? null"
                [placeholder]="champ.placeholder ?? ''"
                autocomplete="off"
              />
              @if (champ.aide) {
                <mat-hint>{{ champ.aide }}</mat-hint>
              }
              @if (form.controls[champ.cle].touched && form.controls[champ.cle].invalid) {
                <mat-error>Valeur invalide ou manquante.</mat-error>
              }
            </mat-form-field>
          }
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()">
        {{ data.confirmer ?? 'Enregistrer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-dialog {
      display: grid;
      gap: 4px;
      min-width: 440px;
    }
    .form-dialog__description {
      margin: 0 0 8px;
      color: var(--mtm-text-muted);
      font-size: 0.9rem;
    }
    .form-dialog__aide {
      margin: -4px 0 8px 32px;
      color: var(--mtm-text-muted);
    }
    @media (max-width: 640px) {
      .form-dialog {
        min-width: 0;
      }
    }
  `,
})
export class FormDialog {
  protected readonly data = inject<FormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<FormDialog, FormDialogResultat>>(MatDialogRef);

  protected readonly form = new FormGroup(
    Object.fromEntries(
      this.data.champs.map((champ) => {
        const validators = [];
        if (champ.requis) validators.push(champ.type === 'checkbox' ? Validators.requiredTrue : Validators.required);
        if (champ.type === 'number') {
          if (champ.min !== undefined) validators.push(Validators.min(champ.min));
          if (champ.max !== undefined) validators.push(Validators.max(champ.max));
        }
        if (champ.minLength) validators.push(Validators.minLength(champ.minLength));
        const initiale = champ.valeur ?? (champ.type === 'checkbox' ? false : '');
        return [champ.cle, new FormControl<string | number | boolean>(initiale, { nonNullable: true, validators })];
      }),
    ),
  );

  protected valider(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const resultat: FormDialogResultat = {};
    for (const champ of this.data.champs) {
      const brut = this.form.controls[champ.cle].value;
      if (champ.type === 'number') {
        if (brut !== '' && brut !== null) resultat[champ.cle] = Number(brut);
      } else if (champ.type === 'checkbox') {
        resultat[champ.cle] = Boolean(brut);
      } else if (typeof brut === 'string') {
        const texte = brut.trim();
        if (texte !== '') resultat[champ.cle] = texte;
      } else {
        resultat[champ.cle] = brut;
      }
    }
    this.dialogRef.close(resultat);
  }

  static ouvrir(dialog: MatDialog, data: FormDialogData): Observable<FormDialogResultat | undefined> {
    return dialog.open(FormDialog, { width: '520px', data }).afterClosed();
  }
}
