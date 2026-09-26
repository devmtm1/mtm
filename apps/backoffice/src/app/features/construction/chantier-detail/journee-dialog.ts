import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  EntreeJournal,
  EntreeJournalPayload,
  JalonChantier,
} from '../../../core/models/chantier.model';
import { METEOS, label } from '../chantier-status';

export interface JourneeDialogData {
  jalons: JalonChantier[];
  meteos: string[];
  /** Renseigné en modification : la journée à corriger. */
  entree?: EntreeJournal;
}

/**
 * Une journée de chantier (section 16 : date, intervenants, avancement,
 * observations, problèmes, décisions, prochaines actions).
 *
 * Les champs sont nommés un par un plutôt que réunis en bloc de texte : c'est
 * ce qui permet ensuite de lister les seuls problèmes non résolus.
 */
@Component({
  selector: 'app-journee-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.entree ? 'Corriger la journée' : 'Journée de chantier' }}</h2>
    <mat-dialog-content [formGroup]="form" class="journee-dialog">
      <div class="journee-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Date</mat-label>
          <input matInput type="date" formControlName="date" />
          <mat-error>Indiquez la journée concernée.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Étape du planning</mat-label>
          <mat-select formControlName="jalonId">
            <mat-option value="">Aucune en particulier</mat-option>
            @for (jalon of data.jalons; track jalon.id) {
              <mat-option [value]="jalon.id">{{ jalon.libelle }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="journee-dialog__row journee-dialog__row--three">
        <mat-form-field appearance="outline">
          <mat-label>Effectif</mat-label>
          <input matInput type="number" min="0" formControlName="effectif" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Météo</mat-label>
          <mat-select formControlName="meteo">
            <mat-option value="">—</mat-option>
            @for (meteo of data.meteos; track meteo) {
              <mat-option [value]="meteo">{{ meteoLabel(meteo) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Avancement (%)</mat-label>
          <input matInput type="number" min="0" max="100" formControlName="avancement" />
          <mat-hint>Remonte à l’étape choisie.</mat-hint>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Qui était sur place</mat-label>
        <input matInput formControlName="intervenants" placeholder="Équipe maçonnerie, électricien…" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Observations</mat-label>
        <textarea matInput rows="2" formControlName="observations"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Problème rencontré</mat-label>
        <textarea matInput rows="2" formControlName="probleme"></textarea>
        <mat-hint>Laissé vide, la journée est close d’office.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Décisions prises</mat-label>
        <textarea matInput rows="2" formControlName="decisions"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Prochaine action</mat-label>
        <input matInput formControlName="prochaineAction" />
      </mat-form-field>

      <div class="journee-dialog__checks">
        @if (form.controls.probleme.value) {
          <mat-checkbox formControlName="resolu">
            Problème déjà réglé — sinon la journée reste ouverte dans les alertes
          </mat-checkbox>
        }
        <mat-checkbox formControlName="visibleClient">
          Publier cette journée dans l’espace client
        </mat-checkbox>
      </div>
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
        {{ data.entree ? 'Enregistrer' : 'Ajouter la journée' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .journee-dialog {
      display: grid;
      gap: 4px;
      min-width: 540px;
    }
    .journee-dialog__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }
    .journee-dialog__row--three {
      grid-template-columns: repeat(3, 1fr);
    }
    .journee-dialog__checks {
      display: grid;
      gap: 6px;
      padding: 4px 0 8px;
    }
    @media (max-width: 620px) {
      .journee-dialog { min-width: 0; }
      .journee-dialog__row,
      .journee-dialog__row--three { grid-template-columns: 1fr; }
    }
  `,
})
export class JourneeDialog {
  protected readonly data = inject<JourneeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<JourneeDialog, EntreeJournalPayload>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    date: [
      this.data.entree?.date?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10),
      Validators.required,
    ],
    jalonId: [this.data.entree?.jalon?.id ?? ''],
    effectif: [this.data.entree?.effectif ?? (null as number | null)],
    meteo: [this.data.entree?.meteo ?? ''],
    avancement: [this.data.entree?.avancement ?? (null as number | null)],
    intervenants: [this.data.entree?.intervenants ?? ''],
    observations: [this.data.entree?.observations ?? ''],
    probleme: [this.data.entree?.probleme ?? ''],
    decisions: [this.data.entree?.decisions ?? ''],
    prochaineAction: [this.data.entree?.prochaineAction ?? ''],
    resolu: [this.data.entree?.resolu ?? false],
    visibleClient: [this.data.entree?.visibleClient ?? false],
  });

  protected meteoLabel(code: string): string {
    return label(METEOS, code);
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.dialogRef.close({
      date: valeur.date,
      jalonId: valeur.jalonId || null,
      effectif: valeur.effectif ?? undefined,
      meteo: texte(valeur.meteo),
      avancement: valeur.avancement ?? undefined,
      intervenants: texte(valeur.intervenants),
      observations: texte(valeur.observations),
      probleme: texte(valeur.probleme),
      decisions: texte(valeur.decisions),
      prochaineAction: texte(valeur.prochaineAction),
      // Sans problème signalé, la journée est close : le serveur applique la
      // même règle, on la reflète ici pour que la case cochée dise vrai.
      resolu: valeur.probleme.trim() ? valeur.resolu : true,
      visibleClient: valeur.visibleClient,
    });
  }

  static open(
    dialog: MatDialog,
    data: JourneeDialogData,
  ): Observable<EntreeJournalPayload | undefined> {
    return dialog
      .open(JourneeDialog, { width: '620px', data })
      .afterClosed();
  }
}
