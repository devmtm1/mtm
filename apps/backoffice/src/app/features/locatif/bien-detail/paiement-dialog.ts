import { Component, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import type { CreatePaiementPayload, EcheanceLoyer, LocatifOptions } from '../../../core/models/locatif.model';
import { TYPES_PAIEMENT, MODES_PAIEMENT, simpleLabel } from '../locatif-status';

export interface PaiementDialogData {
  options: Partial<LocatifOptions>;
  /** Échéance ciblée : présélectionnée et non modifiable. */
  echeance?: EcheanceLoyer;
}

/** Encaissement d'un loyer (section 15 : avance, normal, partiel, régularisation). */
@Component({
  selector: 'app-paiement-dialog',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Enregistrer un versement</h2>
    <mat-dialog-content [formGroup]="form" class="paiement-dialog-grid">
      @if (data.echeance) {
        <p class="wide echeance-info">
          Échéance de {{ data.echeance.periode | date: 'MMMM yyyy' }} — reste dû
          {{ resteDu() | number: '1.0-0' }} FCFA
        </p>
      }
      <mat-form-field appearance="outline">
        <mat-label>Type</mat-label>
        <mat-select formControlName="type">
          @for (type of data.options.typesPaiement ?? []; track type) {
            <mat-option [value]="type">{{ typeLabel(type) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Montant (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="montant" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Mode de paiement</mat-label>
        <mat-select formControlName="modePaiement">
          @for (mode of data.options.modesPaiement ?? []; track mode) {
            <mat-option [value]="mode">{{ modeLabel(mode) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date du paiement</mat-label>
        <input matInput type="date" formControlName="datePaiement" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Référence</mat-label>
        <input matInput formControlName="reference" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="2" formControlName="notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: `.paiement-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 420px; } .wide { grid-column: 1 / -1; } .echeance-info { margin: 0 0 4px; font-size: 0.85rem; color: var(--mtm-text-muted); }`,
})
export class PaiementDialog {
  private readonly dialogRef = inject(MatDialogRef<PaiementDialog, CreatePaiementPayload>);
  private readonly formBuilder = inject(FormBuilder);
  readonly data = inject<PaiementDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    type: [this.data.echeance ? 'normal' : 'avance', Validators.required],
    montant: [this.resteDu() || (null as number | null), Validators.required],
    modePaiement: ['virement', Validators.required],
    datePaiement: [new Date().toISOString().slice(0, 10)],
    reference: [''],
    notes: [''],
  });

  protected resteDu(): number {
    const echeance = this.data.echeance;
    if (!echeance) return 0;
    return Math.max(0, Number(echeance.montantPrevu) - Number(echeance.montantPaye));
  }

  protected typeLabel(type: string): string {
    return simpleLabel(TYPES_PAIEMENT, type);
  }

  protected modeLabel(mode: string): string {
    return simpleLabel(MODES_PAIEMENT, mode);
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.dialogRef.close({
      type: valeur.type,
      montant: valeur.montant ?? 0,
      modePaiement: valeur.modePaiement,
      datePaiement: valeur.datePaiement
        ? new Date(valeur.datePaiement).toISOString()
        : undefined,
      reference: texte(valeur.reference),
      notes: texte(valeur.notes),
      echeanceId: this.data.echeance?.id,
    });
  }

  static open(dialog: MatDialog, data: PaiementDialogData): Observable<CreatePaiementPayload | undefined> {
    return dialog.open(PaiementDialog, { width: '480px', data }).afterClosed();
  }
}
