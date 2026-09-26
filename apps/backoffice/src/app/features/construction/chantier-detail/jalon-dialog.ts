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
import type {
  JalonChantier,
  JalonPayload,
} from '../../../core/models/chantier.model';
import { STATUTS_JALON, label } from '../chantier-status';

/**
 * Ampleur d'une étape, traduite en poids pour le calcul d'avancement.
 * Trois niveaux suffisent : personne ne sait quoi mettre dans un champ
 * numérique de 1 à 100, et la précision n’apporte rien à une moyenne.
 */
export const AMPLEURS = [
  { valeur: 1, label: 'Petite étape (quelques jours)' },
  { valeur: 3, label: 'Étape normale (quelques semaines)' },
  { valeur: 6, label: 'Grosse étape (plusieurs mois)' },
] as const;

/** Ramène un poids existant au niveau le plus proche. */
function ampleurLaPlusProche(poids: number): number {
  return AMPLEURS.reduce((proche, niveau) =>
    Math.abs(niveau.valeur - poids) < Math.abs(proche.valeur - poids)
      ? niveau
      : proche,
  ).valeur;
}

export interface JalonDialogData {
  statuts: string[];
  /** Renseigné en modification : le jalon à ajuster. */
  jalon?: JalonChantier;
}

/**
 * Étape du planning des travaux (les « jalons » de la section 16).
 *
 * L'ampleur mérite son champ : sans elle, un mur de clôture de deux
 * jours pèserait autant qu'un gros œuvre de trois mois dans
 * l'avancement du chantier. Elle est demandée en trois niveaux plutôt
 * qu'en nombre, parce que personne ne sait quoi mettre dans un champ
 * de 1 à 100.
 */
@Component({
  selector: 'app-jalon-dialog',
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
    <h2 mat-dialog-title>{{ data.jalon ? 'Modifier l’étape' : 'Nouvelle étape' }}</h2>
    <mat-dialog-content [formGroup]="form" class="jalon-dialog">
      <mat-form-field appearance="outline">
        <mat-label>Libellé</mat-label>
        <input matInput formControlName="libelle" placeholder="Fondations" />
        <mat-error>Donnez un libellé d’au moins deux caractères.</mat-error>
      </mat-form-field>

      <div class="jalon-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Début prévu</mat-label>
          <input matInput type="date" formControlName="dateDebutPrevue" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fin prévue</mat-label>
          <input matInput type="date" formControlName="dateFinPrevue" />
          <mat-hint>Passée et non terminée, l’étape alerte.</mat-hint>
        </mat-form-field>
      </div>

      @if (data.jalon) {
        <div class="jalon-dialog__row">
          <mat-form-field appearance="outline">
            <mat-label>Début réel</mat-label>
            <input matInput type="date" formControlName="dateDebutReelle" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fin réelle</mat-label>
            <input matInput type="date" formControlName="dateFinReelle" />
          </mat-form-field>
        </div>

        <div class="jalon-dialog__row">
          <mat-form-field appearance="outline">
            <mat-label>État</mat-label>
            <mat-select formControlName="statut">
              @for (statut of data.statuts; track statut) {
                <mat-option [value]="statut">{{ statutLabel(statut) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Avancement (%)</mat-label>
            <input matInput type="number" min="0" max="100" formControlName="avancement" />
            <mat-hint>Ignoré si l’étape est terminée : elle vaut alors 100 %.</mat-hint>
          </mat-form-field>
        </div>
      }

      <mat-form-field appearance="outline">
        <mat-label>Ampleur de l’étape</mat-label>
        <mat-select formControlName="poids">
          @for (niveau of AMPLEURS; track niveau.valeur) {
            <mat-option [value]="niveau.valeur">{{ niveau.label }}</mat-option>
          }
        </mat-select>
        <mat-hint>
          Une grosse étape compte davantage dans l’avancement du chantier qu’une
          petite : un gros œuvre de trois mois ne vaut pas une réception d’un jour.
        </mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Description</mat-label>
        <textarea matInput rows="2" formControlName="description"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="confirm()"
        [disabled]="form.invalid"
      >
        {{ data.jalon ? 'Enregistrer' : 'Ajouter l’étape' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .jalon-dialog {
      display: grid;
      gap: 4px;
      min-width: 480px;
    }
    .jalon-dialog__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }
    @media (max-width: 560px) {
      .jalon-dialog { min-width: 0; }
      .jalon-dialog__row { grid-template-columns: 1fr; }
    }
  `,
})
export class JalonDialog {
  protected readonly data = inject<JalonDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<JalonDialog, JalonPayload>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    libelle: [
      this.data.jalon?.libelle ?? '',
      [Validators.required, Validators.minLength(2)],
    ],
    description: [this.data.jalon?.description ?? ''],
    poids: [ampleurLaPlusProche(this.data.jalon?.poids ?? 1)],
    dateDebutPrevue: [this.data.jalon?.dateDebutPrevue?.slice(0, 10) ?? ''],
    dateFinPrevue: [this.data.jalon?.dateFinPrevue?.slice(0, 10) ?? ''],
    dateDebutReelle: [this.data.jalon?.dateDebutReelle?.slice(0, 10) ?? ''],
    dateFinReelle: [this.data.jalon?.dateFinReelle?.slice(0, 10) ?? ''],
    statut: [this.data.jalon?.statut ?? 'a_venir'],
    avancement: [this.data.jalon?.avancement ?? 0],
  });

  protected readonly AMPLEURS = AMPLEURS;

  protected statutLabel(code: string): string {
    return label(STATUTS_JALON, code);
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    // `null` efface une date côté API, `undefined` la laisse telle quelle :
    // en création on n'envoie rien, en modification on envoie l'effacement.
    const date = (item: string) =>
      item ? item : this.data.jalon ? null : undefined;

    this.dialogRef.close({
      libelle: valeur.libelle.trim(),
      description: texte(valeur.description),
      poids: valeur.poids,
      dateDebutPrevue: date(valeur.dateDebutPrevue),
      dateFinPrevue: date(valeur.dateFinPrevue),
      ...(this.data.jalon
        ? {
            dateDebutReelle: date(valeur.dateDebutReelle),
            dateFinReelle: date(valeur.dateFinReelle),
            statut: valeur.statut,
            avancement: valeur.avancement,
          }
        : {}),
    });
  }

  static open(
    dialog: MatDialog,
    data: JalonDialogData,
  ): Observable<JalonPayload | undefined> {
    return dialog.open(JalonDialog, { width: '560px', data }).afterClosed();
  }
}
