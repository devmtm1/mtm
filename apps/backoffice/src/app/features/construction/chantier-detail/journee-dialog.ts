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
      <!-- Ce qu'on note tous les jours tient en quatre champs. Le reste —
           météo, effectif, problème, décision — ne concerne qu'une journée
           sur cinq : le demander d'emblée décourage la saisie. -->
      <div class="journee-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Quel jour</mat-label>
          <input matInput type="date" formControlName="date" />
          <mat-error>Indiquez la journée concernée.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Sur quelle étape</mat-label>
          <mat-select formControlName="jalonId">
            <mat-option value="">Aucune en particulier</mat-option>
            @for (jalon of data.jalons; track jalon.id) {
              <mat-option [value]="jalon.id">{{ jalon.libelle }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Qui était sur place</mat-label>
        <input
          matInput
          formControlName="intervenants"
          placeholder="Équipe maçonnerie, électricien…"
        />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Ce qui a été fait</mat-label>
        <textarea
          matInput
          rows="3"
          formControlName="observations"
          placeholder="Élévation des murs du rez-de-chaussée terminée."
        ></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Où en est cette étape (%)</mat-label>
        <input matInput type="number" min="0" max="100" formControlName="avancement" />
        <mat-hint>{{ aideAvancement() }}</mat-hint>
      </mat-form-field>

      <details class="journee-dialog__plus" [open]="aDesDetails()">
        <summary>Un problème, une décision, ou d’autres précisions ?</summary>

        <mat-form-field appearance="outline">
          <mat-label>Problème rencontré</mat-label>
          <textarea matInput rows="2" formControlName="probleme"></textarea>
          <mat-hint>
            Tant qu’il n’est pas coché comme réglé, il reste signalé sur le chantier.
          </mat-hint>
        </mat-form-field>

        @if (form.controls.probleme.value) {
          <mat-checkbox formControlName="resolu" class="journee-dialog__check">
            Ce problème est déjà réglé
          </mat-checkbox>
        }

        <mat-form-field appearance="outline">
          <mat-label>Décision prise</mat-label>
          <textarea matInput rows="2" formControlName="decisions"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prochaine action</mat-label>
          <input matInput formControlName="prochaineAction" />
        </mat-form-field>

        <div class="journee-dialog__row">
          <mat-form-field appearance="outline">
            <mat-label>Nombre de personnes</mat-label>
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
        </div>
      </details>

      <mat-checkbox formControlName="visibleClient" class="journee-dialog__check">
        Montrer cette journée au client dans son espace
      </mat-checkbox>
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
    .journee-dialog__check {
      display: block;
      padding: 2px 0 10px;
    }
    /* Ce qui ne concerne qu'une journée sur cinq reste replié. */
    .journee-dialog__plus {
      display: grid;
      gap: 4px;
      margin: 2px 0 10px;
      padding: 10px 12px;
      border: 1px solid var(--mtm-border);
      border-radius: 8px;
    }
    .journee-dialog__plus summary {
      cursor: pointer;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--mtm-text-muted);
    }
    .journee-dialog__plus[open] summary {
      margin-bottom: 10px;
      color: var(--mtm-text-dark);
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

  /** Dit à quoi sert le pourcentage, plutôt que de le laisser deviner. */
  protected aideAvancement(): string {
    const id = this.form.controls.jalonId.value;
    const jalon = this.data.jalons.find((item) => item.id === id);
    if (!jalon) {
      return 'Choisissez une étape pour que ce pourcentage la fasse avancer.';
    }
    return `Met à jour l’étape « ${jalon.libelle} », aujourd’hui à ${jalon.avancement} %.`;
  }

  /** Ouvre le repli d'emblée quand la journée qu'on corrige en contient. */
  protected aDesDetails(): boolean {
    const entree = this.data.entree;
    if (!entree) return false;
    return Boolean(
      entree.probleme ||
        entree.decisions ||
        entree.prochaineAction ||
        entree.effectif ||
        entree.meteo,
    );
  }

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
