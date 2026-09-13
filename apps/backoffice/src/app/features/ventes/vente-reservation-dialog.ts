import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { Observable } from 'rxjs';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

export interface VenteReservationDialogData {
  dossierLabel: string;
  terrainLabel: string;
  prixVente: number | null;
  dureeParDefaut: number;
}

export interface VenteReservationDialogResult {
  montantAcompte: number;
  dureeBlocageJours: number;
  conditionsAnnulation?: string;
}

/**
 * Réserver le terrain pour ce client : l'acompte est enregistré comme
 * paiement validé, le terrain est retiré du site public jusqu'à la date
 * d'expiration, le dossier passe en « Réservé ».
 */
@Component({
  selector: 'app-vente-reservation-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Réserver le terrain</h2>
    <mat-dialog-content class="res-dialog">
      <p class="res-dialog__intro">
        <strong>{{ data.terrainLabel }}</strong> sera bloqué pour ce client et retiré du site public jusqu’à la
        date d’expiration. L’acompte est enregistré comme paiement validé ; le dossier passe en « Réservé ».
      </p>
      <form [formGroup]="form" class="res-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Acompte versé (FCFA)</mat-label>
          <input matInput type="number" min="0" step="1000" formControlName="montantAcompte" />
          @if (overPrice()) {
            <mat-hint class="hint-error">Dépasse le prix de vente ({{ data.prixVente | mtmMoney }}).</mat-hint>
          } @else if (data.prixVente) {
            <mat-hint>Prix de vente : {{ data.prixVente | mtmMoney }} — soit {{ share() }} % du prix.</mat-hint>
          } @else {
            <mat-hint>0 possible si l’acompte n’est pas encore encaissé.</mat-hint>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Durée de blocage (jours)</mat-label>
          <input matInput type="number" min="1" max="365" formControlName="dureeBlocageJours" />
          <mat-hint>Expire le {{ expiration() }}. Passé ce délai, le terrain est libéré.</mat-hint>
          <mat-error>Entre 1 et 365 jours.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="res-dialog__wide">
          <mat-label>Conditions d’annulation</mat-label>
          <textarea matInput rows="2" formControlName="conditionsAnnulation" placeholder="Ex. Acompte remboursable à 50 % en cas de désistement sous 30 jours"></textarea>
          <mat-hint>Ce qui se passe si le client renonce.</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || overPrice()">Réserver</button>
    </mat-dialog-actions>
  `,
  styles: `
    .res-dialog { display: grid; gap: 12px; min-width: min(520px, calc(100vw - 96px)); }
    .res-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .res-dialog__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; }
    .res-dialog__wide { grid-column: 1 / -1; }
    @media (max-width: 560px) { .res-dialog__form { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class VenteReservationDialog {
  private readonly dialogRef = inject(MatDialogRef<VenteReservationDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<VenteReservationDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    montantAcompte: [this.data.prixVente ? Math.round(this.data.prixVente * 0.1) : 0, [Validators.required, Validators.min(0)]],
    dureeBlocageJours: [this.data.dureeParDefaut || 15, [Validators.required, Validators.min(1), Validators.max(365)]],
    conditionsAnnulation: [''],
  });

  private readonly value = signal(this.form.getRawValue());
  protected readonly overPrice = computed(() => !!this.data.prixVente && Number(this.value().montantAcompte) > this.data.prixVente);
  protected readonly share = computed(() => (this.data.prixVente ? Math.round((Number(this.value().montantAcompte) / this.data.prixVente) * 100) : 0));
  protected readonly expiration = computed(() => {
    const date = new Date();
    date.setDate(date.getDate() + Number(this.value().dureeBlocageJours || 0));
    return date.toLocaleDateString('fr-FR');
  });

  constructor() {
    this.form.valueChanges.subscribe(() => this.value.set(this.form.getRawValue()));
  }

  protected submit(): void {
    if (this.form.invalid || this.overPrice()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const result: VenteReservationDialogResult = {
      montantAcompte: Number(raw.montantAcompte),
      dureeBlocageJours: Number(raw.dureeBlocageJours),
      ...(raw.conditionsAnnulation.trim() ? { conditionsAnnulation: raw.conditionsAnnulation.trim() } : {}),
    };
    this.dialogRef.close(result);
  }

  static open(dialog: MatDialog, data: VenteReservationDialogData): Observable<VenteReservationDialogResult | undefined> {
    return dialog.open(VenteReservationDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
