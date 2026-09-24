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
  CreateMouvementCautionPayload,
  EtatCaution,
  LocatifOptions,
} from '../../../core/models/locatif.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { TYPES_MOUVEMENT_CAUTION, simpleLabel } from '../locatif-status';

export interface CautionDialogData {
  options: Partial<LocatifOptions>;
  etat: EtatCaution | null;
  /** Les remboursements demandent la permission « payer » (section 24). */
  peutPayer: boolean;
}

/**
 * Mouvement de caution : versement, retenue, remboursement ou ajustement.
 * Chaque ligne reste dans l'historique exigé par la section 15.
 */
@Component({
  selector: 'app-caution-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MoneyPipe,
  ],
  template: `
    <h2 mat-dialog-title>Mouvement de caution</h2>
    <mat-dialog-content [formGroup]="form" class="caution-dialog-grid">
      @if (data.etat; as etat) {
        <p class="wide caution-dialog__etat">
          Prévue {{ etat.montantInitial | mtmMoney }} · versée {{ etat.verse | mtmMoney }} ·
          retenue {{ etat.retenu | mtmMoney }} · remboursée {{ etat.rembourse | mtmMoney }} ·
          <strong>détenue {{ etat.disponible | mtmMoney }}</strong>
        </p>
      }
      <mat-form-field appearance="outline">
        <mat-label>Nature</mat-label>
        <mat-select formControlName="type">
          @for (type of typesDisponibles(); track type) {
            <mat-option [value]="type">{{ typeLabel(type) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Montant (FCFA)</mat-label>
        <input matInput type="number" min="1" formControlName="montant" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Date</mat-label>
        <input matInput type="date" formControlName="date" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Justification (obligatoire pour une retenue)</mat-label>
        <textarea matInput rows="2" formControlName="justification"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .caution-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 420px; }
    .wide { grid-column: 1 / -1; }
    .caution-dialog__etat { margin: 0 0 4px; font-size: 0.8rem; color: #6b7280; }
  `,
})
export class CautionDialog {
  private readonly dialogRef = inject(MatDialogRef<CautionDialog, CreateMouvementCautionPayload>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<CautionDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    type: ['versement', Validators.required],
    montant: [null as number | null, [Validators.required, Validators.min(1)]],
    date: [new Date().toISOString().slice(0, 10)],
    justification: [''],
  });

  protected typesDisponibles(): string[] {
    const tous = this.data.options.typesMouvementCaution ?? [
      'versement',
      'retenue',
      'remboursement',
      'ajustement',
    ];
    // Sans la permission « payer », le remboursement n'est pas proposé plutôt
    // que refusé après coup.
    return this.data.peutPayer ? tous : tous.filter((type) => type !== 'remboursement');
  }

  protected typeLabel(type: string): string {
    return simpleLabel(TYPES_MOUVEMENT_CAUTION, type);
  }

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    this.dialogRef.close({
      type: valeur.type,
      montant: Number(valeur.montant),
      date: valeur.date || undefined,
      justification: valeur.justification.trim() || undefined,
    });
  }

  static open(
    dialog: MatDialog,
    data: CautionDialogData,
  ): Observable<CreateMouvementCautionPayload | undefined> {
    return dialog.open(CautionDialog, { width: '480px', data }).afterClosed();
  }
}
