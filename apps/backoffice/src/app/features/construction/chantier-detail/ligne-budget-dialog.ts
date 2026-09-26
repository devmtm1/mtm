import { Component, computed, inject, signal } from '@angular/core';
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
  LigneBudget,
  LigneBudgetPayload,
} from '../../../core/models/chantier.model';
import { POSTES_BUDGET, label, montant } from '../chantier-status';

export interface LigneBudgetDialogData {
  postes: string[];
  unites: string[];
  ligne?: LigneBudget;
}

/**
 * Ligne du budget prévisionnel (section 16 : « devis, budget, matériaux »).
 *
 * Quantité et prix unitaire sont facultatifs : un poste de main-d'œuvre se
 * chiffre au forfait. Quand les deux sont donnés, le total se calcule tout
 * seul — une ligne ne doit jamais contredire ses propres composantes.
 */
@Component({
  selector: 'app-ligne-budget-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.ligne ? 'Modifier la ligne' : 'Nouveau poste de budget' }}</h2>
    <mat-dialog-content [formGroup]="form" class="ligne-dialog">
      <div class="ligne-dialog__row">
        <mat-form-field appearance="outline">
          <mat-label>Poste</mat-label>
          <mat-select formControlName="poste">
            @for (poste of data.postes; track poste) {
              <mat-option [value]="poste">{{ posteLabel(poste) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Libellé</mat-label>
          <input matInput formControlName="libelle" placeholder="Ciment CEM II" />
          <mat-error>Décrivez le poste.</mat-error>
        </mat-form-field>
      </div>

      <div class="ligne-dialog__row ligne-dialog__row--three">
        <mat-form-field appearance="outline">
          <mat-label>Quantité</mat-label>
          <input matInput type="number" min="0" formControlName="quantite" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Unité</mat-label>
          <mat-select formControlName="unite">
            <mat-option value="">—</mat-option>
            @for (unite of data.unites; track unite) {
              <mat-option [value]="unite">{{ unite }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prix unitaire (FCFA)</mat-label>
          <input matInput type="number" min="0" formControlName="prixUnitaire" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline">
        <mat-label>Montant prévu (FCFA)</mat-label>
        <input matInput type="number" min="0" formControlName="montantPrevu" />
        <mat-hint>{{ aideMontant() }}</mat-hint>
        <mat-error>Indiquez un montant, ou une quantité et un prix unitaire.</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Notes</mat-label>
        <textarea matInput rows="2" formControlName="notes"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Annuler</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        (click)="confirm()"
        [disabled]="!estValide()"
      >
        {{ data.ligne ? 'Enregistrer' : 'Ajouter au budget' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .ligne-dialog {
      display: grid;
      gap: 4px;
      min-width: 480px;
    }
    .ligne-dialog__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }
    .ligne-dialog__row--three {
      grid-template-columns: 1fr 0.7fr 1fr;
    }
    @media (max-width: 560px) {
      .ligne-dialog { min-width: 0; }
      .ligne-dialog__row,
      .ligne-dialog__row--three { grid-template-columns: 1fr; }
    }
  `,
})
export class LigneBudgetDialog {
  protected readonly data = inject<LigneBudgetDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<LigneBudgetDialog, LigneBudgetPayload>>(MatDialogRef);
  private readonly formBuilder = inject(FormBuilder);

  /** Recalculé à chaque frappe pour afficher le total déduit. */
  private readonly calcul = signal({ quantite: 0, prixUnitaire: 0 });

  protected readonly form = this.formBuilder.nonNullable.group({
    poste: [this.data.ligne?.poste ?? this.data.postes[0] ?? 'materiaux'],
    libelle: [
      this.data.ligne?.libelle ?? '',
      [Validators.required, Validators.minLength(2)],
    ],
    quantite: [
      this.data.ligne ? montant(this.data.ligne.quantite) || null : (null as number | null),
    ],
    unite: [this.data.ligne?.unite ?? ''],
    prixUnitaire: [
      this.data.ligne
        ? montant(this.data.ligne.prixUnitaire) || null
        : (null as number | null),
    ],
    montantPrevu: [
      this.data.ligne ? montant(this.data.ligne.montantPrevu) : (null as number | null),
    ],
    notes: [this.data.ligne?.notes ?? ''],
  });

  /** Total déduit de la quantité et du prix, quand les deux sont là. */
  protected readonly totalDeduit = computed(() => {
    const { quantite, prixUnitaire } = this.calcul();
    return quantite > 0 && prixUnitaire > 0 ? quantite * prixUnitaire : 0;
  });

  constructor() {
    const suivre = () =>
      this.calcul.set({
        quantite: this.form.controls.quantite.value ?? 0,
        prixUnitaire: this.form.controls.prixUnitaire.value ?? 0,
      });
    this.form.controls.quantite.valueChanges.subscribe(suivre);
    this.form.controls.prixUnitaire.valueChanges.subscribe(suivre);
  }

  protected posteLabel(code: string): string {
    return label(POSTES_BUDGET, code);
  }

  protected aideMontant(): string {
    const total = this.totalDeduit();
    if (total > 0) {
      return `Calculé depuis la quantité : ${total.toLocaleString('fr-FR')} FCFA.`;
    }
    return 'Saisi directement pour un poste au forfait.';
  }

  /** Un montant, ou de quoi le calculer : l'un des deux suffit. */
  protected estValide(): boolean {
    if (this.form.controls.libelle.invalid) return false;
    return (
      this.totalDeduit() > 0 || (this.form.controls.montantPrevu.value ?? 0) > 0
    );
  }

  protected confirm(): void {
    if (!this.estValide()) {
      this.form.markAllAsTouched();
      return;
    }
    const valeur = this.form.getRawValue();
    const texte = (item: string) => (item.trim() ? item.trim() : undefined);
    this.dialogRef.close({
      poste: valeur.poste,
      libelle: valeur.libelle.trim(),
      quantite: valeur.quantite ?? undefined,
      unite: texte(valeur.unite),
      prixUnitaire: valeur.prixUnitaire ?? undefined,
      // Le serveur recalcule si quantité et prix sont fournis : on ne lui
      // envoie un total que lorsqu'il ne peut pas le déduire.
      montantPrevu:
        this.totalDeduit() > 0
          ? undefined
          : (valeur.montantPrevu ?? undefined),
      notes: texte(valeur.notes),
    });
  }

  static open(
    dialog: MatDialog,
    data: LigneBudgetDialogData,
  ): Observable<LigneBudgetPayload | undefined> {
    return dialog
      .open(LigneBudgetDialog, { width: '560px', data })
      .afterClosed();
  }
}
