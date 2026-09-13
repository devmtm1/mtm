import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { modeLabel } from './ventes-status';

export interface VentePaiementDialogData {
  dossierLabel: string;
  prixVente: number | null;
  montantPaye: number;
  soldeRestant: number | null;
  modes: string[];
}

export interface VentePaiementDialogResult {
  montant: number;
  mode: string;
  reference?: string;
  datePaiement?: string;
  notes?: string;
}

/**
 * Enregistrer un paiement reçu du client. Il reste « à valider » jusqu'au
 * contrôle par une personne habilitée ; seul un paiement validé compte dans
 * le montant payé.
 */
@Component({
  selector: 'app-vente-paiement-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MoneyPipe],
  template: `
    <h2 mat-dialog-title>Enregistrer un paiement</h2>
    <mat-dialog-content class="pay-dialog">
      <p class="pay-dialog__intro">
        Dossier <strong>{{ data.dossierLabel }}</strong>. Le paiement sera <strong>à valider</strong> par une personne
        habilitée avant de compter dans le montant payé.
      </p>
      <dl class="pay-dialog__facts">
        <div><dt>Prix de vente</dt><dd>{{ data.prixVente | mtmMoney }}</dd></div>
        <div><dt>Déjà payé</dt><dd>{{ data.montantPaye | mtmMoney }}</dd></div>
        <div><dt>Reste dû</dt><dd class="is-accent">{{ data.soldeRestant | mtmMoney }}</dd></div>
      </dl>
      <form [formGroup]="form" class="pay-dialog__form">
        <mat-form-field appearance="outline">
          <mat-label>Montant reçu (FCFA)</mat-label>
          <input matInput type="number" min="1" step="1000" formControlName="montant" />
          @if (overSolde()) {
            <mat-hint class="hint-error">Dépasse le reste dû ({{ data.soldeRestant | mtmMoney }}).</mat-hint>
          } @else if (data.soldeRestant !== null) {
            <mat-hint>
              <button type="button" class="link-button" (click)="fillSolde()">Solder le dossier ({{ data.soldeRestant | mtmMoney }})</button>
            </mat-hint>
          }
          <mat-error>Indiquez un montant positif.</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Mode de paiement</mat-label>
          <mat-select formControlName="mode">
            @for (mode of data.modes; track mode) {
              <mat-option [value]="mode">{{ modeLabel(mode) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date du paiement</mat-label>
          <input matInput type="date" formControlName="datePaiement" />
          <mat-hint>Par défaut : aujourd’hui.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Référence</mat-label>
          <input matInput formControlName="reference" placeholder="N° de virement, de reçu…" />
          <mat-hint>Pour retrouver le paiement sur le relevé.</mat-hint>
        </mat-form-field>
        <mat-form-field appearance="outline" class="pay-dialog__wide">
          <mat-label>Note</mat-label>
          <input matInput formControlName="notes" placeholder="Ex. 2e acompte convenu par téléphone" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || overSolde()">Enregistrer le paiement</button>
    </mat-dialog-actions>
  `,
  styles: `
    .pay-dialog { display: grid; gap: 12px; min-width: min(520px, calc(100vw - 96px)); }
    .pay-dialog__intro { margin: 0; color: var(--mtm-text-muted); font-size: 0.86rem; line-height: 1.5; }
    .pay-dialog__facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0; padding: 12px; border-radius: 10px; background: var(--mtm-bg-surface); }
    .pay-dialog__facts dt { color: var(--mtm-text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .pay-dialog__facts dd { margin: 2px 0 0; font-size: 0.9rem; font-weight: 700; }
    .pay-dialog__facts .is-accent { color: var(--mtm-primary); }
    .pay-dialog__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; }
    .pay-dialog__wide { grid-column: 1 / -1; }
    @media (max-width: 560px) { .pay-dialog__form, .pay-dialog__facts { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class VentePaiementDialog {
  private readonly dialogRef = inject(MatDialogRef<VentePaiementDialog>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<VentePaiementDialogData>(MAT_DIALOG_DATA);
  protected readonly modeLabel = modeLabel;

  protected readonly form = this.formBuilder.nonNullable.group({
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    mode: [this.data.modes.includes('virement') ? 'virement' : (this.data.modes[0] ?? 'virement'), Validators.required],
    datePaiement: [new Date().toISOString().slice(0, 10)],
    reference: [''],
    notes: [''],
  });

  private readonly montant = signal<number | null>(null);
  protected readonly overSolde = computed(() => this.data.soldeRestant !== null && (this.montant() ?? 0) > this.data.soldeRestant);

  constructor() {
    this.form.controls.montant.valueChanges.subscribe((value) => this.montant.set(value === null ? null : Number(value)));
  }

  protected fillSolde(): void {
    if (this.data.soldeRestant !== null) this.form.controls.montant.setValue(this.data.soldeRestant);
  }

  protected submit(): void {
    if (this.form.invalid || this.overSolde()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const result: VentePaiementDialogResult = {
      montant: Number(raw.montant),
      mode: raw.mode,
      ...(raw.reference.trim() ? { reference: raw.reference.trim() } : {}),
      ...(raw.datePaiement ? { datePaiement: new Date(raw.datePaiement).toISOString() } : {}),
      ...(raw.notes.trim() ? { notes: raw.notes.trim() } : {}),
    };
    this.dialogRef.close(result);
  }

  static open(dialog: MatDialog, data: VentePaiementDialogData): Observable<VentePaiementDialogResult | undefined> {
    return dialog.open(VentePaiementDialog, { width: '560px', maxWidth: 'calc(100vw - 32px)', data }).afterClosed();
  }
}
