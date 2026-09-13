import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { CommercialSummary } from '../../core/models/prospect.model';
import type { VenteOptions } from '../../core/models/vente.model';

export interface VenteCommissionDialogData {
  dossierLabel: string;
  /** Commercial responsable du dossier, présélectionné. */
  commercialId: string | null;
  commercials: CommercialSummary[];
  regles: VenteOptions['reglesCommissions'];
}

export interface VenteCommissionDialogResult {
  commercialId: string;
  regleId: string;
  taux?: number;
  montantFixe?: number;
}

/**
 * Création d'une commission (section 12 CDC) : choix du commercial et de la
 * règle paramétrée. Les valeurs de la règle s'appliquent par défaut ; un
 * responsable peut les surcharger pour ce dossier (accord particulier).
 */
@Component({
  selector: 'app-vente-commission-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Créer une commission</h2>
    <mat-dialog-content>
      <p class="dialog-intro">
        Dossier <strong>{{ data.dossierLabel }}</strong>. La commission est d’abord <strong>estimée</strong> à partir de la règle,
        puis validée par un responsable, puis payée une fois le dossier soldé.
      </p>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Commercial bénéficiaire</mat-label>
          <mat-select formControlName="commercialId">
            @for (commercial of data.commercials; track commercial.id) {
              <mat-option [value]="commercial.id">{{ commercial.firstName }} {{ commercial.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Règle de commission</mat-label>
          <mat-select formControlName="regleId">
            @for (regle of data.regles; track regle.id) {
              <mat-option [value]="regle.id">{{ regle.description }}</mat-option>
            }
          </mat-select>
          <mat-hint>Le montant est calculé par le système à partir de la règle et du prix de vente.</mat-hint>
        </mat-form-field>
        @if (selectedRule()?.typeRegle === 'pourcentage') {
          <mat-form-field appearance="outline">
            <mat-label>Taux particulier (%) — facultatif</mat-label>
            <input matInput type="number" min="0" max="100" step="0.1" formControlName="taux" />
          </mat-form-field>
        }
        @if (selectedRule()?.typeRegle === 'montant_fixe') {
          <mat-form-field appearance="outline">
            <mat-label>Montant particulier (FCFA) — facultatif</mat-label>
            <input matInput type="number" min="0" formControlName="montantFixe" />
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid">
        Créer la commission
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-intro { margin: 0 0 12px; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; max-width: 480px; }
    .dialog-form { display: grid; gap: 4px; min-width: min(460px, calc(100vw - 96px)); }
  `,
})
export class VenteCommissionDialog {
  private readonly dialogRef = inject(MatDialogRef<VenteCommissionDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<VenteCommissionDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    commercialId: [this.data.commercialId ?? '', [Validators.required]],
    regleId: [this.data.regles[0]?.id ?? '', [Validators.required]],
    taux: [null as number | null],
    montantFixe: [null as number | null],
  });

  protected selectedRule() {
    const id = this.form.controls.regleId.value;
    return this.data.regles.find((regle) => regle.id === id) ?? null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const result: VenteCommissionDialogResult = {
      commercialId: raw.commercialId,
      regleId: raw.regleId,
      ...(raw.taux !== null ? { taux: Number(raw.taux) } : {}),
      ...(raw.montantFixe !== null ? { montantFixe: Number(raw.montantFixe) } : {}),
    };
    this.dialogRef.close(result);
  }
}
