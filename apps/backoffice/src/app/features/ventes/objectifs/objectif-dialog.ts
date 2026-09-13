import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { CommercialSummary } from '../../../core/models/prospect.model';
import type { ObjectifCommercial, UpsertObjectifPayload } from '../../../core/models/objectif.model';

export interface ObjectifDialogData {
  periode: string;
  /** « septembre 2026 », pour le titre. */
  periodeLabel?: string;
  commercials: CommercialSummary[];
  /** Objectif existant à modifier, sinon création. */
  existing: ObjectifCommercial | null;
  /** Commercial présélectionné (création depuis une ligne du tableau). */
  commercialId?: string;
}

/**
 * Fixer ou corriger l'objectif mensuel d'un commercial. Chaque cible est
 * facultative : un manager peut ne suivre que le chiffre d'affaires.
 */
@Component({
  selector: 'app-objectif-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ data.existing ? 'Modifier l’objectif' : 'Fixer un objectif' }} — {{ data.periodeLabel ?? data.periode }}</h2>
    <mat-dialog-content>
      <p class="dialog-intro">
        Chaque cible est facultative : ne renseignez que ce que vous suivez. Le taux d’atteinte se calcule
        automatiquement à partir des dossiers et paiements du mois.
      </p>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Commercial</mat-label>
          <mat-select formControlName="commercialId">
            @for (commercial of data.commercials; track commercial.id) {
              <mat-option [value]="commercial.id">{{ commercial.firstName }} {{ commercial.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ventes visées (nombre de dossiers)</mat-label>
          <input matInput type="number" min="0" step="1" formControlName="cibleVentes" />
          <mat-hint>Compte les dossiers réservés, en paiement ou soldés dans le mois.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Chiffre d’affaires encaissé visé (FCFA)</mat-label>
          <input matInput type="number" min="0" step="100000" formControlName="cibleChiffreAffaires" />
          <mat-hint>Compte les paiements validés dans le mois (pas les promesses).</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Commissions visées (FCFA)</mat-label>
          <input matInput type="number" min="0" step="10000" formControlName="cibleCommissions" />
          <mat-hint>Compte les commissions validées ou payées dans le mois.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Notes</mat-label>
          <textarea matInput rows="2" formControlName="notes" placeholder="Ex. Priorité aux terrains de Diamniadio ce mois-ci"></textarea>
          <mat-hint>Visible par le commercial sur sa carte.</mat-hint>
        </mat-form-field>
      </form>
      @if (!hasAnyTarget()) {
        <p class="dialog-warn">Renseignez au moins une cible.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || !hasAnyTarget()">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-intro { margin: 0 0 12px; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; max-width: 480px; }
    .dialog-form { display: grid; gap: 4px; min-width: min(460px, calc(100vw - 96px)); }
    .dialog-warn { margin: 8px 0 0; color: var(--mtm-warning); font-size: 0.82rem; }
  `,
})
export class ObjectifDialog {
  private readonly dialogRef = inject(MatDialogRef<ObjectifDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<ObjectifDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    commercialId: [this.data.existing?.commercialId ?? this.data.commercialId ?? '', [Validators.required]],
    cibleVentes: [this.data.existing?.cibleVentes ?? (null as number | null), [Validators.min(0)]],
    cibleChiffreAffaires: [toNumberOrNull(this.data.existing?.cibleChiffreAffaires), [Validators.min(0)]],
    cibleCommissions: [toNumberOrNull(this.data.existing?.cibleCommissions), [Validators.min(0)]],
    notes: [this.data.existing?.notes ?? ''],
  });

  protected hasAnyTarget(): boolean {
    const { cibleVentes, cibleChiffreAffaires, cibleCommissions } = this.form.getRawValue();
    return [cibleVentes, cibleChiffreAffaires, cibleCommissions].some((value) => value !== null && value !== undefined && `${value}` !== '');
  }

  protected submit(): void {
    if (this.form.invalid || !this.hasAnyTarget()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: UpsertObjectifPayload = {
      commercialId: raw.commercialId,
      periode: this.data.periode,
      ...(isSet(raw.cibleVentes) ? { cibleVentes: Number(raw.cibleVentes) } : {}),
      ...(isSet(raw.cibleChiffreAffaires) ? { cibleChiffreAffaires: Number(raw.cibleChiffreAffaires) } : {}),
      ...(isSet(raw.cibleCommissions) ? { cibleCommissions: Number(raw.cibleCommissions) } : {}),
      ...(raw.notes.trim() ? { notes: raw.notes.trim() } : {}),
    };
    this.dialogRef.close(payload);
  }
}

function toNumberOrNull(value: number | string | null | undefined): number | null {
  return value === null || value === undefined || value === '' ? null : Number(value);
}

function isSet(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && `${value}` !== '';
}
