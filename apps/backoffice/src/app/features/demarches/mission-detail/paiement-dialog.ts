import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { Observable } from 'rxjs';
import type { PaiementMission, PaiementMissionPayload } from '../../../core/models/mission.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { MODES_PAIEMENT, label } from '../mission-status';

export interface PaiementDialogData {
  modes: string[];
  /** Règlement à corriger ; absent pour une nouvelle saisie. */
  paiement?: PaiementMission;
  /** Reste à payer avant ce règlement, proposé comme montant par défaut. */
  soldeRestant?: number | null;
}

/** « 2026-10-02T17:08 » : la valeur attendue par un champ date et heure local. */
function versChampLocal(date: Date): string {
  const decalage = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - decalage).toISOString().slice(0, 16);
}

/**
 * Saisie d'un règlement : le montant envoyé par le client, les frais du
 * transfert (Wave, Orange Money…) et l'identifiant de la transaction. Le net
 * reçu est calculé, jamais saisi : c'est l'écart entre les deux.
 */
@Component({
  selector: 'app-paiement-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MoneyPipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.paiement ? 'Corriger le règlement' : 'Enregistrer un règlement' }}</h2>
    <mat-dialog-content>
      <p class="paiement__intro">
        Un acompte, un solde, un transfert Wave. Le montant envoyé s’impute sur le prix de la mission ; les frais de
        transfert restent à part.
      </p>
      <form [formGroup]="form" class="paiement__form">
        <mat-form-field appearance="outline">
          <mat-label>Date et heure du règlement</mat-label>
          <input matInput type="datetime-local" formControlName="datePaiement" />
          <mat-error>Indiquez la date du règlement.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mode de paiement</mat-label>
          <mat-select formControlName="mode">
            @for (mode of data.modes; track mode) {
              <mat-option [value]="mode">{{ libelleMode(mode) }}</mat-option>
            }
          </mat-select>
          <mat-error>Choisissez le mode de paiement.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Montant envoyé par le client (FCFA)</mat-label>
          <input matInput type="number" min="1" formControlName="montantEnvoye" />
          @if (data.soldeRestant && !data.paiement) {
            <mat-hint>Reste à payer : {{ data.soldeRestant | mtmMoney }}</mat-hint>
          }
          <mat-error>Indiquez un montant supérieur à 0.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Frais de transfert (FCFA)</mat-label>
          <input matInput type="number" min="0" formControlName="frais" />
          <mat-hint>Frais Wave, Orange Money, banque… 0 s’il n’y en a pas.</mat-hint>
        </mat-form-field>

        <p class="paiement__net" [class.paiement__net--erreur]="netInvalide">
          Net reçu par MTM : <strong>{{ net | mtmMoney }}</strong>
          @if (netInvalide) {
            — les frais dépassent le montant envoyé.
          }
        </p>

        <mat-form-field appearance="outline" class="paiement__wide">
          <mat-label>Identifiant de la transaction</mat-label>
          <input matInput formControlName="reference" placeholder="ID Wave, numéro de virement, de chèque…" />
          <mat-hint>Une même transaction ne peut être saisie qu’une fois.</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="paiement__wide">
          <mat-label>Note (facultatif)</mat-label>
          <input matInput formControlName="note" maxlength="500" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="valider()">
        {{ data.paiement ? 'Enregistrer la correction' : 'Enregistrer le règlement' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .paiement__intro { margin: 0 0 14px; font-size: 0.88rem; color: var(--mtm-text-muted, #6b7280); }
    .paiement__form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 14px; min-width: min(560px, calc(100vw - 96px)); }
    .paiement__wide { grid-column: 1 / -1; }
    .paiement__net { grid-column: 1 / -1; margin: 0 0 14px; padding: 8px 12px; border-radius: 8px; background: var(--mtm-bg, #f5f7fa); font-size: 0.9rem; }
    .paiement__net--erreur { background: var(--mtm-error-bg); color: var(--mtm-error); }
    @media (max-width: 640px) { .paiement__form { grid-template-columns: 1fr; } }
  `,
})
export class PaiementDialog {
  private readonly dialogRef = inject(MatDialogRef<PaiementDialog, PaiementMissionPayload>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<PaiementDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    datePaiement: [
      versChampLocal(this.data.paiement ? new Date(this.data.paiement.datePaiement) : new Date()),
      Validators.required,
    ],
    mode: [this.data.paiement?.mode ?? (this.data.modes.includes('mobile_money') ? 'mobile_money' : ''), Validators.required],
    montantEnvoye: [
      this.data.paiement
        ? Number(this.data.paiement.montantEnvoye)
        : ((this.data.soldeRestant || null) as number | null),
      [Validators.required, Validators.min(1)],
    ],
    frais: [this.data.paiement ? Number(this.data.paiement.frais) : 0, Validators.min(0)],
    reference: [this.data.paiement?.reference ?? ''],
    note: [this.data.paiement?.note ?? ''],
  });

  protected get net(): number {
    const { montantEnvoye, frais } = this.form.getRawValue();
    return Math.max((montantEnvoye ?? 0) - (frais ?? 0), 0);
  }

  protected get netInvalide(): boolean {
    const { montantEnvoye, frais } = this.form.getRawValue();
    return (frais ?? 0) > (montantEnvoye ?? 0);
  }

  protected libelleMode(mode: string): string {
    return label(MODES_PAIEMENT, mode);
  }

  protected valider(): void {
    if (this.form.invalid || this.netInvalide) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.dialogRef.close({
      datePaiement: new Date(valeur.datePaiement).toISOString(),
      montantEnvoye: Number(valeur.montantEnvoye),
      frais: Number(valeur.frais ?? 0),
      mode: valeur.mode,
      reference: texte(valeur.reference),
      note: texte(valeur.note),
    } satisfies PaiementMissionPayload);
  }

  static open(dialog: MatDialog, data: PaiementDialogData): Observable<PaiementMissionPayload | undefined> {
    return dialog
      .open(PaiementDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)', data })
      .afterClosed() as Observable<PaiementMissionPayload | undefined>;
  }
}
