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
import type { Observable } from 'rxjs';
import type { Regularisation, SortiePayload } from '../../../core/models/locatif.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

export interface SortieDialogData {
  /** Calcul de régularisation proposé par l'API (section 15). */
  regularisation: Regularisation | null;
}

/**
 * Sortie du locataire : état des lieux, régularisation, restitution de caution.
 *
 * Les montants sont préremplis par le calcul de régularisation de l'API et son
 * détail est affiché : l'opérateur confirme ou corrige, il ne devine plus.
 */
@Component({
  selector: 'app-sortie-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MoneyPipe,
  ],
  template: `
    <h2 mat-dialog-title>Clôturer le bail — sortie du locataire</h2>
    <mat-dialog-content [formGroup]="form" class="sortie-dialog-grid">
      @if (data.regularisation; as calcul) {
        <div class="wide sortie-dialog__calcul">
          <h3>Régularisation calculée</h3>
          <dl>
            <div><dt>Loyers appelés</dt><dd>{{ calcul.loyersDus | mtmMoney }}</dd></div>
            <div><dt>Loyers encaissés</dt><dd>{{ calcul.loyersEncaisses | mtmMoney }}</dd></div>
            <div><dt>Avance sur mois postérieurs</dt><dd>{{ calcul.avanceReportee | mtmMoney }}</dd></div>
            <div><dt>Reste dû avant caution</dt><dd>{{ calcul.resteDu | mtmMoney }}</dd></div>
            <div><dt>Caution détenue</dt><dd>{{ calcul.caution.disponible | mtmMoney }}</dd></div>
            <div><dt>Solde proposé</dt><dd>{{ calcul.montantPropose | mtmMoney }}</dd></div>
          </dl>
        </div>
      }
      <mat-form-field appearance="outline">
        <mat-label>Date de sortie réelle</mat-label>
        <input matInput type="date" formControlName="dateSortieReelle" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Caution remboursée (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="cautionRembourseeMontant" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Caution retenue (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="cautionRetenue" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Régularisation (FCFA)</mat-label>
        <input matInput type="number" formControlName="regularisationMontant" />
        <mat-hint>Positif = reste dû par le locataire, négatif = à lui restituer</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Justification de la retenue (obligatoire si retenue)</mat-label>
        <textarea matInput rows="2" formControlName="cautionJustification"></textarea>
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>État des lieux de sortie</mat-label>
        <textarea matInput rows="2" formControlName="etatLieuxSortie"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="confirm()" [disabled]="form.invalid">
        Clôturer le bail
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .sortie-dialog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 460px; }
    .wide { grid-column: 1 / -1; }
    .sortie-dialog__calcul { background: rgba(26, 73, 116, 0.06); border-radius: 8px; padding: 12px 14px; }
    .sortie-dialog__calcul h3 { margin: 0 0 8px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .sortie-dialog__calcul dl { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin: 0; }
    .sortie-dialog__calcul div { display: flex; justify-content: space-between; gap: 8px; }
    .sortie-dialog__calcul dt { color: #6b7280; font-size: 0.78rem; }
    .sortie-dialog__calcul dd { margin: 0; font-weight: 600; font-size: 0.82rem; }
  `,
})
export class SortieDialog {
  private readonly dialogRef = inject(MatDialogRef<SortieDialog, SortiePayload>);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly data = inject<SortieDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    dateSortieReelle: [new Date().toISOString().slice(0, 10), Validators.required],
    cautionRembourseeMontant: [
      this.data.regularisation?.cautionARembourserProposee ?? (null as number | null),
    ],
    cautionRetenue: [this.data.regularisation?.retenueCautionProposee ?? (null as number | null)],
    regularisationMontant: [this.data.regularisation?.montantPropose ?? (null as number | null)],
    cautionJustification: [''],
    etatLieuxSortie: [''],
  });

  protected confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.dialogRef.close({
      dateSortieReelle: valeur.dateSortieReelle,
      cautionRembourseeMontant: valeur.cautionRembourseeMontant ?? undefined,
      cautionRetenue: valeur.cautionRetenue ?? undefined,
      regularisationMontant: valeur.regularisationMontant ?? undefined,
      cautionJustification: texte(valeur.cautionJustification),
      etatLieuxSortie: texte(valeur.etatLieuxSortie),
    });
  }

  static open(dialog: MatDialog, data: SortieDialogData): Observable<SortiePayload | undefined> {
    return dialog.open(SortieDialog, { width: '560px', data }).afterClosed();
  }
}
